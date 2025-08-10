import { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

// Extension des types NextAuth pour inclure nos champs personnalisés
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      company: string
      role: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    company: string
    role: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    company: string
    role: string
  }
}

// Types pour les formulaires d'authentification
export interface SignInFormData {
  email: string
  password: string
}

export interface SignUpFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  company: string
}

export interface ResetPasswordFormData {
  email: string
}

export interface NewPasswordFormData {
  password: string
  confirmPassword: string
  token: string
}

// Types pour la gestion des utilisateurs
export interface UserProfile {
  id: string
  name: string
  email: string
  company: string
  role: string
  isEmailVerified: boolean
  settings: {
    notifications: {
      email: boolean
      deadlines: boolean
      supplierResponses: boolean
    }
    language: 'fr' | 'en'
    timezone: string
  }
  subscription: {
    plan: 'free' | 'starter' | 'pro'
    status: 'active' | 'inactive' | 'cancelled'
    expiresAt?: string
  }
  createdAt: string
  lastLoginAt?: string
}

// Types pour les réponses API
export interface AuthResponse {
  success: boolean
  message: string
  user?: UserProfile
  error?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: any
}