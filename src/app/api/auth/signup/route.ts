import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/db/mongodb'
import User from '@/models/User'
import { z } from 'zod'

// Schéma de validation renforcé
const signupSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),
  email: z.string()
    .email('Format d\'email invalide')
    .toLowerCase()
    .trim(),
  company: z.string()
    .min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères')
    .max(200, 'Le nom de l\'entreprise ne peut pas dépasser 200 caractères')
    .trim(),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
})

export async function POST(request: NextRequest) {
  try {
    // Valider Content-Type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Content-Type doit être application/json' 
        },
        { status: 400 }
      )
    }

    // Parser et valider les données
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Corps de la requête JSON invalide' 
        },
        { status: 400 }
      )
    }

    const validatedData = signupSchema.parse(body)

    // Connexion à MongoDB
    await connectDB()

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ 
      email: validatedData.email 
    })

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Un compte avec cet email existe déjà' 
        },
        { status: 409 }
      )
    }

    // Hasher le mot de passe avec un salt plus élevé
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Créer le nouvel utilisateur
    const newUser = new User({
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      company: validatedData.company,
      role: 'user',
      isEmailVerified: false,
      settings: {
        notifications: {
          email: true,
          deadlines: true,
          supplierResponses: true
        },
        language: 'fr',
        timezone: 'Europe/Paris'
      },
      subscription: {
        plan: 'free',
        status: 'active'
      }
    })

    const savedUser = await newUser.save()

    // Réponse sécurisée sans mot de passe
    const userResponse = {
      id: savedUser._id.toString(),
      name: savedUser.name,
      email: savedUser.email,
      company: savedUser.company,
      role: savedUser.role,
      isEmailVerified: savedUser.isEmailVerified,
      settings: savedUser.settings,
      subscription: savedUser.subscription,
      createdAt: savedUser.createdAt
    }

    console.log('✅ Compte créé avec succès pour:', validatedData.email)

    return NextResponse.json(
      {
        success: true,
        message: 'Compte créé avec succès',
        user: userResponse
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('❌ Erreur lors de la création du compte:', error)

    // Erreurs de validation Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Données de validation invalides',
          details: error.flatten().fieldErrors
        },
        { status: 422 }
      )
    }

    // Erreurs de contrainte unique MongoDB
    if ((error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern || {})[0]
      return NextResponse.json(
        { 
          success: false, 
          error: `Un compte avec ce ${field} existe déjà` 
        },
        { status: 409 }
      )
    }

    // Erreurs de connexion MongoDB
    if ((error as any).name === 'MongoError' || (error as any).name === 'MongooseError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erreur de base de données. Veuillez réessayer.' 
        },
        { status: 503 }
      )
    }

    // Erreur générique
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur interne du serveur' 
      },
      { status: 500 }
    )
  }
}