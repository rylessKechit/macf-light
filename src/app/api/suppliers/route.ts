import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import Supplier from '@/models/Supplier'
import { ApiResponse, PaginatedResponse, SupplierForm } from '@/types/cbam'
import { z } from 'zod'

// Schéma de validation pour la création d'un fournisseur
const createSupplierSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  country: z.string().min(1, 'Le pays est requis').max(100),
  address: z.string().max(500).optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  contactPhone: z.string().max(20).optional(),
  registrationNumber: z.string().max(50).optional()
})

// Schéma de validation pour les filtres de recherche
const searchSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  country: z.string().optional(),
  isVerified: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
})

// GET /api/suppliers - Récupérer les fournisseurs de l'utilisateur
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

    if (params.country) {
      filter.country = params.country
    }

    if (params.isVerified !== undefined) {
      filter.isVerified = params.isVerified === 'true'
    }

    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { country: { $regex: params.search, $options: 'i' } },
        { address: { $regex: params.search, $options: 'i' } },
        { contactEmail: { $regex: params.search, $options: 'i' } }
      ]
    }

    // Construction du tri
    const sortField = ['name', 'country', 'createdAt', 'isVerified'].includes(params.sortBy) 
      ? params.sortBy : 'name'
    const sortOrder = params.sortOrder === 'desc' ? -1 : 1
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder }

    // Exécution des requêtes
    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(filter)
    ])

    const totalPages = Math.ceil(total / limit)

    const response: PaginatedResponse<any> = {
      data: suppliers,
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
    console.error('Erreur lors de la récupération des fournisseurs:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Paramètres invalides',
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

// POST /api/suppliers - Créer un nouveau fournisseur
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
    const validatedData = createSupplierSchema.parse(body)

    // Vérifier qu'un fournisseur avec le même nom et pays n'existe pas déjà
    const existingSupplier = await Supplier.findOne({
      userId: session.user.id,
      name: validatedData.name,
      country: validatedData.country
    })

    if (existingSupplier) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Un fournisseur avec ce nom existe déjà dans ${validatedData.country}` 
        },
        { status: 400 }
      )
    }

    // Créer le nouveau fournisseur
    const supplier = new Supplier({
      userId: session.user.id,
      name: validatedData.name,
      country: validatedData.country,
      address: validatedData.address,
      contactEmail: validatedData.contactEmail || undefined,
      contactPhone: validatedData.contactPhone,
      registrationNumber: validatedData.registrationNumber,
      isVerified: false,
      carbonIntensityData: []
    })

    await supplier.save()

    const response: ApiResponse = {
      success: true,
      data: supplier,
      message: 'Fournisseur créé avec succès'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Erreur lors de la création du fournisseur:', error)

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

    // Gérer les erreurs de contrainte unique
    if ((error as any).code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Un fournisseur avec ce nom et ce pays existe déjà' 
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