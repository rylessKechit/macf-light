import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import CbamDeclaration from '@/models/CbamDeclaration'
import { ApiResponse, CreateDeclarationForm, PaginatedResponse } from '@/types/cbam'
import { z } from 'zod'

// Schéma de validation pour la création d'une déclaration
const createDeclarationSchema = z.object({
  quarter: z.number().min(1).max(4),
  year: z.number().min(2023).max(new Date().getFullYear() + 1)
})

// Schéma de validation pour les filtres de recherche
const searchSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.string().optional(),
  year: z.string().optional(),
  quarter: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// GET /api/declarations - Récupérer les déclarations de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const params = searchSchema.parse(Object.fromEntries(searchParams.entries()))

    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit

    // Construction de la requête de filtre
    const filter: any = { userId: session.user.id }

    if (params.status) {
      filter.status = params.status
    }

    if (params.year) {
      filter['reportingPeriod.year'] = parseInt(params.year)
    }

    if (params.quarter) {
      filter['reportingPeriod.quarter'] = parseInt(params.quarter)
    }

    if (params.search) {
      filter.$or = [
        { notes: { $regex: params.search, $options: 'i' } },
        { rejectionReason: { $regex: params.search, $options: 'i' } }
      ]
    }

    // Construction du tri
    const sortField = params.sortBy === 'createdAt' ? 'createdAt' : 
                     params.sortBy === 'deadlineDate' ? 'deadlineDate' :
                     params.sortBy === 'submittedAt' ? 'submittedAt' : 'createdAt'
    
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder }

    // Exécution des requêtes
    const [declarations, total] = await Promise.all([
      CbamDeclaration.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email company')
        .lean(),
      CbamDeclaration.countDocuments(filter)
    ])

    const totalPages = Math.ceil(total / limit)

    const response: PaginatedResponse<any> = {
      data: declarations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Erreur lors de la récupération des déclarations:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/declarations - Créer une nouvelle déclaration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    await connectDB()

    const body = await request.json()
    const validatedData = createDeclarationSchema.parse(body)

    // Vérifier qu'une déclaration n'existe pas déjà pour cette période
    const existingDeclaration = await CbamDeclaration.findOne({
      userId: session.user.id,
      'reportingPeriod.year': validatedData.year,
      'reportingPeriod.quarter': validatedData.quarter
    })

    if (existingDeclaration) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Une déclaration existe déjà pour T${validatedData.quarter} ${validatedData.year}` 
        },
        { status: 400 }
      )
    }

    // Créer la nouvelle déclaration
    const declaration = new CbamDeclaration({
      userId: session.user.id,
      reportingPeriod: {
        quarter: validatedData.quarter,
        year: validatedData.year
      },
      status: 'draft',
      summary: {
        totalImports: 0,
        totalQuantity: 0,
        totalValue: 0,
        totalEmissions: 0,
        totalCertificatesRequired: 0,
        totalCertificatesHeld: 0
      },
      deadlineDate: calculateDeadline(validatedData.year, validatedData.quarter)
    })

    await declaration.save()

    // Populer les données utilisateur pour la réponse
    await declaration.populate('userId', 'name email company')

    const response: ApiResponse = {
      success: true,
      data: declaration,
      message: 'Déclaration créée avec succès'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Erreur lors de la création de la déclaration:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Données invalides',
          errors: error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Fonction utilitaire pour calculer la date limite
function calculateDeadline(year: number, quarter: number): Date {
  // Les deadlines CBAM sont :
  // Q1 : 31 mai, Q2 : 31 août, Q3 : 30 novembre, Q4 : 28/29 février de l'année suivante
  const deadlines = [
    new Date(year, 4, 31), // 31 mai (mois 4 = mai car indexé à 0)
    new Date(year, 7, 31), // 31 août
    new Date(year, 10, 30), // 30 novembre
    new Date(year + 1, 1, 28) // 28 février année suivante
  ]
  
  return deadlines[quarter - 1]
}