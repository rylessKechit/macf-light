import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import CbamProduct from '@/models/CbamProduct'
import { ApiResponse, PaginatedResponse, CbamSector } from '@/types/cbam'
import { z } from 'zod'

// Schéma de validation pour les filtres de recherche
const searchSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  sector: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  activeOnly: z.string().optional().default('true')
})

// GET /api/products - Récupérer la liste des produits CBAM
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

    // Vérifier si c'est une demande pour les secteurs
    if (searchParams.get('action') === 'sectors') {
      return getAvailableSectors()
    }

    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit

    // Construction de la requête de filtre
    const filter: any = {}

    if (params.activeOnly === 'true') {
      filter.isActive = true
    }

    if (params.sector) {
      filter.sector = params.sector
    }

    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { description: { $regex: params.search, $options: 'i' } },
        { cnCode: { $regex: params.search, $options: 'i' } }
      ]
    }

    // Construction du tri
    const sortField = ['name', 'cnCode', 'sector', 'carbonIntensity', 'createdAt'].includes(params.sortBy) 
      ? params.sortBy : 'name'
    const sortOrder = params.sortOrder === 'desc' ? -1 : 1
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder }

    // Exécution des requêtes
    const [products, total] = await Promise.all([
      CbamProduct.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CbamProduct.countDocuments(filter)
    ])

    const totalPages = Math.ceil(total / limit)

    const response: PaginatedResponse<any> = {
      data: products,
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
    console.error('Erreur lors de la récupération des produits:', error)

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

// Fonction utilitaire pour récupérer les secteurs disponibles
async function getAvailableSectors() {
  try {
    await connectDB()

    const sectors = await CbamProduct.distinct('sector', { isActive: true })
    
    const sectorLabels: Record<CbamSector, string> = {
      cement: 'Ciment',
      iron_steel: 'Fer et acier',
      aluminum: 'Aluminium',
      fertilizers: 'Engrais',
      electricity: 'Électricité',
      hydrogen: 'Hydrogène'
    }

    const sectorsWithLabels = sectors.map(sector => ({
      value: sector,
      label: sectorLabels[sector as CbamSector] || sector
    }))

    return NextResponse.json({
      success: true,
      data: sectorsWithLabels
    })

  } catch (error) {
    console.error('Erreur lors de la récupération des secteurs:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}