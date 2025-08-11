import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/db/mongodb'
import User from '@/models/User'
import { z } from 'zod'

// Schéma de validation pour l'inscription
const signupSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  email: z.string().email('Email invalide'),
  company: z.string()
    .min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères')
    .max(200, 'Le nom de l\'entreprise ne peut pas dépasser 200 caractères'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
})

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ 
      email: validatedData.email.toLowerCase() 
    })

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Un compte avec cet email existe déjà' 
        },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Créer le nouvel utilisateur
    const newUser = new User({
      name: validatedData.name,
      email: validatedData.email.toLowerCase(),
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

    await newUser.save()

    // Retourner la réponse sans le mot de passe
    const userResponse = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      company: newUser.company,
      role: newUser.role,
      isEmailVerified: newUser.isEmailVerified,
      settings: newUser.settings,
      subscription: newUser.subscription,
      createdAt: newUser.createdAt
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Compte créé avec succès',
        user: userResponse
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Erreur lors de la création du compte:', error)

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

    // Gérer les erreurs de contrainte unique de MongoDB
    if ((error as any).code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Un compte avec cet email existe déjà' 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la création du compte' 
      },
      { status: 500 }
    )
  }
}