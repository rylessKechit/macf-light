import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import CbamProduct from '@/models/CbamProduct'
import { CbamSector } from '@/types/cbam'

// GET /api/products/sectors - Récupérer les secteurs disponibles
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