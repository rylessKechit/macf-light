import mongoose, { Document, Schema, Types } from 'mongoose'
import { DeclarationStatus } from '@/types/cbam'

export interface ICbamDeclaration extends Document {
  userId: Types.ObjectId
  reportingPeriod: {
    quarter: 1 | 2 | 3 | 4
    year: number
  }
  status: DeclarationStatus
  summary: {
    totalImports: number
    totalQuantity: number
    totalValue: number
    totalEmissions: number
    totalCertificatesRequired: number
    totalCertificatesHeld: number
  }
  deadlineDate: Date
  submittedAt?: Date
  validatedAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface ImportDocument {
  quantity: number
  totalValue: number
  carbonEmissions: number
  carbonCertificates?: number
}

const CbamDeclarationSchema = new Schema<ICbamDeclaration>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis'],
    index: true
  },
  reportingPeriod: {
    quarter: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: [true, 'Le trimestre est requis']
    },
    year: {
      type: Number,
      required: [true, 'L\'année est requise'],
      min: [2023, 'L\'année ne peut pas être antérieure à 2023'],
      max: [new Date().getFullYear() + 1, 'L\'année ne peut pas être dans le futur']
    }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'validated', 'rejected', 'pending'],
    default: 'draft',
    index: true
  },
  summary: {
    totalImports: {
      type: Number,
      default: 0,
      min: [0, 'Le nombre d\'importations ne peut pas être négatif']
    },
    totalQuantity: {
      type: Number,
      default: 0,
      min: [0, 'La quantité totale ne peut pas être négative']
    },
    totalValue: {
      type: Number,
      default: 0,
      min: [0, 'La valeur totale ne peut pas être négative']
    },
    totalEmissions: {
      type: Number,
      default: 0,
      min: [0, 'Les émissions totales ne peuvent pas être négatives']
    },
    totalCertificatesRequired: {
      type: Number,
      default: 0,
      min: [0, 'Le nombre de certificats requis ne peut pas être négatif']
    },
    totalCertificatesHeld: {
      type: Number,
      default: 0,
      min: [0, 'Le nombre de certificats détenus ne peut pas être négatif']
    }
  },
  deadlineDate: {
    type: Date,
    required: [true, 'La date limite est requise'],
    index: true
  },
  submittedAt: {
    type: Date,
    index: true
  },
  validatedAt: {
    type: Date,
    index: true
  },
  rejectedAt: {
    type: Date,
    index: true
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [1000, 'La raison de rejet ne peut pas dépasser 1000 caractères']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Les notes ne peuvent pas dépasser 2000 caractères']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: Document, ret: Record<string, any>) {
      ret.id = ret._id.toString()
      delete ret._id
      delete ret.__v
      return ret
    }
  }
})

// Index composé pour éviter les doublons (utilisateur + période)
CbamDeclarationSchema.index(
  { userId: 1, 'reportingPeriod.year': 1, 'reportingPeriod.quarter': 1 },
  { unique: true }
)

// Index pour les recherches et le tri
CbamDeclarationSchema.index({ userId: 1, status: 1, deadlineDate: 1 })
CbamDeclarationSchema.index({ deadlineDate: 1, status: 1 })
CbamDeclarationSchema.index({ createdAt: -1 })

// Méthodes statiques
CbamDeclarationSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 }).populate('userId', 'name email company')
}

CbamDeclarationSchema.statics.findByPeriod = function(year: number, quarter?: number) {
  const query: Record<string, any> = { 'reportingPeriod.year': year }
  if (quarter) {
    query['reportingPeriod.quarter'] = quarter
  }
  return this.find(query).sort({ createdAt: -1 }).populate('userId', 'name email company')
}

CbamDeclarationSchema.statics.findPendingDeadlines = function(daysAhead: number = 30) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)
  
  return this.find({
    status: { $in: ['draft', 'pending'] },
    deadlineDate: { $lte: futureDate }
  }).sort({ deadlineDate: 1 }).populate('userId', 'name email company')
}

CbamDeclarationSchema.statics.getStatsByUser = function(userId: string) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEmissions: { $sum: '$summary.totalEmissions' },
        totalValue: { $sum: '$summary.totalValue' }
      }
    }
  ])
}

// Méthodes d'instance
CbamDeclarationSchema.methods.canBeEdited = function(): boolean {
  return this.status === 'draft' || this.status === 'rejected'
}

CbamDeclarationSchema.methods.canBeSubmitted = function(): boolean {
  return this.status === 'draft' && this.summary.totalImports > 0
}

CbamDeclarationSchema.methods.submit = function() {
  if (!this.canBeSubmitted()) {
    throw new Error('Cette déclaration ne peut pas être soumise')
  }
  
  this.status = 'submitted'
  this.submittedAt = new Date()
  return this.save()
}

CbamDeclarationSchema.methods.validate = function() {
  if (this.status !== 'submitted') {
    throw new Error('Seules les déclarations soumises peuvent être validées')
  }
  
  this.status = 'validated'
  this.validatedAt = new Date()
  return this.save()
}

CbamDeclarationSchema.methods.reject = function(reason: string) {
  if (this.status !== 'submitted') {
    throw new Error('Seules les déclarations soumises peuvent être rejetées')
  }
  
  this.status = 'rejected'
  this.rejectedAt = new Date()
  this.rejectionReason = reason
  return this.save()
}

CbamDeclarationSchema.methods.calculateDeadline = function(): Date {
  const { year, quarter } = this.reportingPeriod
  
  // Les deadlines CBAM sont :
  // Q1 : 31 mai, Q2 : 31 août, Q3 : 30 novembre, Q4 : 28/29 février de l'année suivante
  const deadlines = [
    new Date(year, 4, 31), // 31 mai (mois 4 = mai car indexé à 0)
    new Date(year, 7, 31), // 31 août
    new Date(year, 10, 30), // 30 novembre
    new Date(year + 1, 1, 28) // 28 février année suivante
  ]
  
  return deadlines[quarter - 1]
}

CbamDeclarationSchema.methods.updateSummary = async function() {
  const CbamImport = mongoose.models.CbamImport
  
  const imports: ImportDocument[] = await CbamImport.find({ declarationId: this._id })
  
  this.summary = {
    totalImports: imports.length,
    totalQuantity: imports.reduce((sum: number, imp: ImportDocument) => sum + imp.quantity, 0),
    totalValue: imports.reduce((sum: number, imp: ImportDocument) => sum + imp.totalValue, 0),
    totalEmissions: imports.reduce((sum: number, imp: ImportDocument) => sum + imp.carbonEmissions, 0),
    totalCertificatesRequired: imports.reduce((sum: number, imp: ImportDocument) => sum + imp.carbonEmissions, 0), // 1 certificat = 1 tCO2e
    totalCertificatesHeld: imports.reduce((sum: number, imp: ImportDocument) => sum + (imp.carbonCertificates || 0), 0)
  }
  
  return this.save()
}

CbamDeclarationSchema.methods.getPeriodLabel = function(): string {
  return `T${this.reportingPeriod.quarter} ${this.reportingPeriod.year}`
}

CbamDeclarationSchema.methods.getStatusLabel = function(): string {
  const statusLabels: Record<DeclarationStatus, string> = {
    draft: 'Brouillon',
    submitted: 'Soumise',
    validated: 'Validée',
    rejected: 'Rejetée',
    pending: 'En attente'
  }
  return statusLabels[this.status as DeclarationStatus]
}

CbamDeclarationSchema.methods.isOverdue = function(): boolean {
  return new Date() > this.deadlineDate && this.status !== 'validated'
}

CbamDeclarationSchema.methods.getDaysUntilDeadline = function(): number {
  const now = new Date()
  const diffTime = this.deadlineDate.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export default mongoose.models.CbamDeclaration || mongoose.model<ICbamDeclaration>('CbamDeclaration', CbamDeclarationSchema)