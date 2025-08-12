import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
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
  comparePassword(candidatePassword: string): Promise<boolean>
  updateLastLogin(): Promise<IUser>
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères'],
    index: true
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
    ],
    index: true
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
    maxlength: [128, 'Le mot de passe ne peut pas dépasser 128 caractères'],
    select: false // Exclure par défaut des requêtes
  },
  company: {
    type: String,
    required: [true, 'Le nom de l\'entreprise est requis'],
    trim: true,
    minlength: [2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères'],
    maxlength: [200, 'Le nom de l\'entreprise ne peut pas dépasser 200 caractères'],
    index: true
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'user', 'supplier'],
      message: 'Le rôle doit être admin, user ou supplier'
    },
    default: 'user',
    index: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
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
      enum: {
        values: ['fr', 'en'],
        message: 'La langue doit être fr ou en'
      },
      default: 'fr'
    },
    timezone: {
      type: String,
      default: 'Europe/Paris',
      validate: {
        validator: function(v: string) {
          // Validation basique du timezone
          return /^[A-Za-z_\/]+$/.test(v)
        },
        message: 'Format de timezone invalide'
      }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: {
        values: ['free', 'starter', 'pro'],
        message: 'Le plan doit être free, starter ou pro'
      },
      default: 'free'
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'cancelled'],
        message: 'Le statut doit être active, inactive ou cancelled'
      },
      default: 'active'
    },
    expiresAt: {
      type: Date,
      validate: {
        validator: function(v: Date) {
          return !v || v > new Date()
        },
        message: 'La date d\'expiration doit être dans le futur'
      }
    }
  },
  lastLoginAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      // Supprimer les champs sensibles du JSON
      delete ret.password
      delete ret.emailVerificationToken
      delete ret.resetPasswordToken
      delete ret.resetPasswordExpires
      delete ret.__v
      // Convertir _id en string
      ret.id = ret._id.toString()
      delete ret._id
      return ret
    }
  },
  toObject: {
    transform: function(doc: any, ret: any) {
      delete ret.password
      delete ret.emailVerificationToken
      delete ret.resetPasswordToken
      delete ret.resetPasswordExpires
      delete ret.__v
      return ret
    }
  }
})

// Index composés pour optimiser les requêtes
UserSchema.index({ email: 1, role: 1 })
UserSchema.index({ company: 1, role: 1 })
UserSchema.index({ createdAt: -1 })
UserSchema.index({ lastLoginAt: -1 })

// Méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const bcrypt = require('bcryptjs')
  return bcrypt.compare(candidatePassword, this.password)
}

// Méthode pour mettre à jour la dernière connexion
UserSchema.methods.updateLastLogin = function(): Promise<IUser> {
  this.lastLoginAt = new Date()
  return this.save()
}

// Middleware pre-save pour éviter le double hashage
UserSchema.pre('save', function(next) {
  // Ne pas re-hasher si le password n'a pas été modifié
  if (!this.isModified('password')) return next()
  
  // Le hashage sera fait dans la route API pour plus de contrôle
  next()
})

// Middleware pour gérer les erreurs de validation
UserSchema.post('save', function(error: any, doc: any, next: any) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0]
    next(new Error(`Un compte avec ce ${field} existe déjà`))
  } else {
    next(error)
  }
})

// Export du modèle avec vérification d'existence
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)