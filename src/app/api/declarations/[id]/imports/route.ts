import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import CbamDeclaration from '@/models/CbamDeclaration'
import CbamImport from '@/models/CbamImport'
import CbamProduct from '@/models/CbamProduct'
import { ApiResponse, ImportForm } from '@/types/cbam'
import { z } from 'zod'

// Schéma de validation pour la création d'une importation
const createImportSchema = z.object({
  productId: z.string().min(1, 'Le produit est requis'),
  supplierName: z.string().min(1, 'Le nom du fournisseur est requis').max(200),
  supplierCountry: z.string().min(1, 'Le pays du fournisseur est requis').max(100),
  quantity: z.number().min(0.001, 'La quantité doit être supérieure à 0').max(1000000),
  unitValue: z.number().min(0.01, 'La valeur unitaire doit être supérieure à 0').max(1000000),
  carbonEmissions: z.number().min(0, 'Les émissions ne peuvent pas être négatives').max(1000000),
  carbonCertificates: z.number().min(0, 'Le nombre de certificats ne peut pas être négatif').max(1000000).optional(),
  notes: z.string().max(1000).optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/declarations/[id]/imports - Récupérer les importations d'une déclaration
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    await connectDB()

    // Vérifier que la déclaration appartient à l'utilisateur
    const declaration = await CbamDeclaration.findOne({
      _id: params.id,
      userId: session.user.id
    })

    if (!declaration) {
      return NextResponse.json(
        { success: false, error: 'Déclaration non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer les importations avec les produits populés
    const imports = await CbamImport.find({ declarationId: params.id })
      .populate('productId', 'name cnCode sector carbonIntensity')
      .sort({ createdAt: -1 })

    const response: ApiResponse = {
      success: true,
      data: imports
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erreur lors de la récupération des importations:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/declarations/[id]/imports - Créer une nouvelle importation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    await connectDB()

    // Vérifier que la déclaration appartient à l'utilisateur et peut être modifiée
    const declaration = await CbamDeclaration.findOne({
      _id: params.id,
      userId: session.user.id
    })

    if (!declaration) {
      return NextResponse.json(
        { success: false, error: 'Déclaration non trouvée' },
        { status: 404 }
      )
    }

    if (!declaration.canBeEdited()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cette déclaration ne peut pas être modifiée' 
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = createImportSchema.parse(body)

    // Vérifier que le produit existe
    const product = await CbamProduct.findById(validatedData.productId)
    if (!product || !product.isActive) {
      return NextResponse.json(
        { success: false, error: 'Produit non trouvé ou inactif' },
        { status: 400 }
      )
    }

    // Calculer la valeur totale
    const totalValue = validatedData.quantity * validatedData.unitValue

    // Créer la nouvelle importation
    const newImport = new CbamImport({
      declarationId: params.id,
      productId: validatedData.productId,
      supplierName: validatedData.supplierName,
      supplierCountry: validatedData.supplierCountry,
      quantity: validatedData.quantity,
      unitValue: validatedData.unitValue,
      totalValue,
      carbonEmissions: validatedData.carbonEmissions,
      carbonCertificates: validatedData.carbonCertificates,
      notes: validatedData.notes,
      status: 'pending',
      documents: []
    })

    await newImport.save()

    // Populer le produit pour la réponse
    await newImport.populate('productId', 'name cnCode sector carbonIntensity')

    // Mettre à jour le résumé de la déclaration
    await declaration.updateSummary()

    const response: ApiResponse = {
      success: true,
      data: newImport,
      message: 'Importation créée avec succès'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Erreur lors de la création de l\'importation:', error)

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