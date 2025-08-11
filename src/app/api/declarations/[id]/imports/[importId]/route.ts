import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import CbamDeclaration from '@/models/CbamDeclaration'
import CbamImport from '@/models/CbamImport'
import CbamProduct from '@/models/CbamProduct'
import { ApiResponse } from '@/types/cbam'
import { z } from 'zod'

// Schéma de validation pour la mise à jour d'une importation
const updateImportSchema = z.object({
  supplierName: z.string().min(1).max(200).optional(),
  supplierCountry: z.string().min(1).max(100).optional(),
  quantity: z.number().min(0.001).max(1000000).optional(),
  unitValue: z.number().min(0.01).max(1000000).optional(),
  carbonEmissions: z.number().min(0).max(1000000).optional(),
  carbonCertificates: z.number().min(0).max(1000000).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'error']).optional()
})

interface RouteParams {
  params: {
    id: string
    importId: string
  }
}

// GET /api/declarations/[id]/imports/[importId] - Récupérer une importation spécifique
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

    // Récupérer l'importation
    const importItem = await CbamImport.findOne({
      _id: params.importId,
      declarationId: params.id
    }).populate('productId', 'name cnCode sector carbonIntensity')

    if (!importItem) {
      return NextResponse.json(
        { success: false, error: 'Importation non trouvée' },
        { status: 404 }
      )
    }

    const response: ApiResponse = {
      success: true,
      data: importItem
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'importation:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT /api/declarations/[id]/imports/[importId] - Mettre à jour une importation
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Récupérer l'importation
    const importItem = await CbamImport.findOne({
      _id: params.importId,
      declarationId: params.id
    })

    if (!importItem) {
      return NextResponse.json(
        { success: false, error: 'Importation non trouvée' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateImportSchema.parse(body)

    // Mettre à jour les champs modifiables
    Object.keys(validatedData).forEach(key => {
      if (validatedData[key as keyof typeof validatedData] !== undefined) {
        (importItem as any)[key] = validatedData[key as keyof typeof validatedData]
      }
    })

    // Recalculer la valeur totale si nécessaire
    if (validatedData.quantity !== undefined || validatedData.unitValue !== undefined) {
      importItem.totalValue = importItem.quantity * importItem.unitValue
    }

    await importItem.save()

    // Populer le produit pour la réponse
    await importItem.populate('productId', 'name cnCode sector carbonIntensity')

    // Mettre à jour le résumé de la déclaration
    await declaration.updateSummary()

    const response: ApiResponse = {
      success: true,
      data: importItem,
      message: 'Importation mise à jour avec succès'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'importation:', error)

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

// DELETE /api/declarations/[id]/imports/[importId] - Supprimer une importation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Vérifier que l'importation existe
    const importItem = await CbamImport.findOne({
      _id: params.importId,
      declarationId: params.id
    })

    if (!importItem) {
      return NextResponse.json(
        { success: false, error: 'Importation non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer l'importation
    await CbamImport.findByIdAndDelete(params.importId)

    // Mettre à jour le résumé de la déclaration
    await declaration.updateSummary()

    const response: ApiResponse = {
      success: true,
      message: 'Importation supprimée avec succès'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'importation:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}