import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import CbamDeclaration from '@/models/CbamDeclaration'
import CbamImport from '@/models/CbamImport'
import { ApiResponse } from '@/types/cbam'
import { z } from 'zod'

// Schéma de validation pour la mise à jour d'une déclaration
const updateDeclarationSchema = z.object({
  notes: z.string().max(2000).optional(),
  status: z.enum(['draft', 'submitted', 'validated', 'rejected', 'pending']).optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/declarations/[id] - Récupérer une déclaration spécifique
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

    const declaration = await CbamDeclaration.findOne({
      _id: params.id,
      userId: session.user.id
    }).populate('userId', 'name email company')

    if (!declaration) {
      return NextResponse.json(
        { success: false, error: 'Déclaration non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer les importations associées
    const imports = await CbamImport.find({ declarationId: params.id })
      .populate('productId', 'name cnCode sector carbonIntensity')
      .sort({ createdAt: -1 })

    const response: ApiResponse = {
      success: true,
      data: {
        ...declaration.toJSON(),
        imports
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erreur lors de la récupération de la déclaration:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT /api/declarations/[id] - Mettre à jour une déclaration
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

    // Vérifier que la déclaration peut être modifiée
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
    const validatedData = updateDeclarationSchema.parse(body)

    // Mettre à jour les champs modifiables
    if (validatedData.notes !== undefined) {
      declaration.notes = validatedData.notes
    }

    // Gérer les changements de statut
    if (validatedData.status && validatedData.status !== declaration.status) {
      switch (validatedData.status) {
        case 'submitted':
          if (!declaration.canBeSubmitted()) {
            return NextResponse.json(
              { 
                success: false, 
                error: 'Cette déclaration ne peut pas être soumise (aucune importation)' 
              },
              { status: 400 }
            )
          }
          await declaration.submit()
          break
          
        case 'draft':
          if (declaration.status === 'rejected') {
            declaration.status = 'draft'
            declaration.rejectedAt = undefined
            declaration.rejectionReason = undefined
          } else {
            return NextResponse.json(
              { 
                success: false, 
                error: 'Impossible de repasser en brouillon' 
              },
              { status: 400 }
            )
          }
          break
          
        default:
          return NextResponse.json(
            { 
              success: false, 
              error: 'Changement de statut non autorisé' 
            },
            { status: 400 }
          )
      }
    } else {
      await declaration.save()
    }

    await declaration.populate('userId', 'name email company')

    const response: ApiResponse = {
      success: true,
      data: declaration,
      message: 'Déclaration mise à jour avec succès'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la déclaration:', error)

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

// DELETE /api/declarations/[id] - Supprimer une déclaration
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

    // Vérifier que la déclaration peut être supprimée
    if (!declaration.canBeEdited()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cette déclaration ne peut pas être supprimée' 
        },
        { status: 400 }
      )
    }

    // Supprimer toutes les importations associées
    await CbamImport.deleteMany({ declarationId: params.id })

    // Supprimer la déclaration
    await CbamDeclaration.findByIdAndDelete(params.id)

    const response: ApiResponse = {
      success: true,
      message: 'Déclaration supprimée avec succès'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erreur lors de la suppression de la déclaration:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}