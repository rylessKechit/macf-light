import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  company: string
  role: 'admin' | 'user' | 'supplier'
  isEmailVerified: boolean
  emailVerificationToken?: string
  resetPasswordToken?: string
  resetPasswordExpires?: Date
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
    expiresAt?: Date
  }
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Veuillez entrer un email valide'
    ]
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
    select: false // N'inclut pas le password par défaut dans les requêtes
  },
  company: {
    type: String,
    required: [true, 'Le nom de l\'entreprise est requis'],
    trim: true,
    maxlength: [200, 'Le nom de l\'entreprise ne peut pas dépasser 200 caractères']
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'supplier'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      deadlines: {
        type: Boolean,
        default: true
      },
      supplierResponses: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      enum: ['fr', 'en'],
      default: 'fr'
    },
    timezone: {
      type: String,
      default: 'Europe/Paris'
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active'
    },
    expiresAt: Date
  },
  lastLoginAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      // Supprimer le password et les tokens sensibles du JSON
      delete ret.password
      delete ret.emailVerificationToken
      delete ret.resetPasswordToken
      delete ret.__v
      return ret
    }
  }
})

// Index pour les recherches fréquentes
UserSchema.index({ email: 1 })
UserSchema.index({ company: 1 })
UserSchema.index({ role: 1 })

// Middleware pre-save pour hasher le password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  const bcrypt = require('bcryptjs')
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Méthodes d'instance
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const bcrypt = require('bcryptjs')
  return bcrypt.compare(candidatePassword, this.password)
}

UserSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date()
  return this.save()
}

// Export du modèle
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)