import mongoose, { Document, Schema, Types } from 'mongoose'
import { CbamSector } from '@/types/cbam'

export interface ICarbonIntensityData {
  sector: CbamSector
  value: number
  verifiedAt: Date
  certificate?: string
}

export interface ISupplier extends Document {
  userId: Types.ObjectId
  name: string
  country: string
  address?: string
  contactEmail?: string
  contactPhone?: string
  registrationNumber?: string
  isVerified: boolean
  carbonIntensityData: ICarbonIntensityData[]
  createdAt: Date
  updatedAt: Date
}

const CarbonIntensityDataSchema = new Schema<ICarbonIntensityData>({
  sector: {
    type: String,
    enum: ['cement', 'iron_steel', 'aluminum', 'fertilizers', 'electricity', 'hydrogen'],
    required: [true, 'Le secteur est requis']
  },
  value: {
    type: Number,
    required: [true, 'La valeur d\'intensité carbone est requise'],
    min: [0, 'L\'intensité carbone ne peut pas être négative'],
    max: [1000, 'L\'intensité carbone ne peut pas dépasser 1000 tCO2e/tonne']
  },
  verifiedAt: {
    type: Date,
    required: [true, 'La date de vérification est requise']
  },
  certificate: {
    type: String,
    trim: true,
    maxlength: [500, 'Le certificat ne peut pas dépasser 500 caractères']
  }
}, { _id: false })

const SupplierSchema = new Schema<ISupplier>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Le nom du fournisseur est requis'],
    trim: true,
    maxlength: [200, 'Le nom ne peut pas dépasser 200 caractères'],
    index: true
  },
  country: {
    type: String,
    required: [true, 'Le pays est requis'],
    trim: true,
    maxlength: [100, 'Le pays ne peut pas dépasser 100 caractères'],
    index: true
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'L\'adresse ne peut pas dépasser 500 caractères']
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Veuillez entrer un email valide'
    ]
  },
  contactPhone: {
    type: String,
    trim: true,
    maxlength: [20, 'Le téléphone ne peut pas dépasser 20 caractères']
  },
  registrationNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Le numéro d\'enregistrement ne peut pas dépasser 50 caractères']
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  carbonIntensityData: [CarbonIntensityDataSchema]
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

// Index composé pour éviter les doublons (utilisateur + nom + pays)
SupplierSchema.index({ userId: 1, name: 1, country: 1 }, { unique: true })

// Index pour les recherches
SupplierSchema.index({ name: 'text', country: 'text', address: 'text' })
SupplierSchema.index({ userId: 1, isVerified: 1 })
SupplierSchema.index({ country: 1, isVerified: 1 })

// Méthodes statiques
SupplierSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ name: 1 })
}

SupplierSchema.statics.findByCountry = function(country: string, userId?: string) {
  const query: Record<string, any> = { country }
  if (userId) {
    query.userId = userId
  }
  return this.find(query).sort({ name: 1 })
}

SupplierSchema.statics.searchSuppliers = function(query: string, userId?: string) {
  const searchQuery: Record<string, any> = {
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { country: { $regex: query, $options: 'i' } },
      { address: { $regex: query, $options: 'i' } }
    ]
  }
  
  if (userId) {
    searchQuery.userId = userId
  }
  
  return this.find(searchQuery).sort({ name: 1 })
}

SupplierSchema.statics.findVerifiedSuppliers = function(userId?: string) {
  const query: Record<string, any> = { isVerified: true }
  if (userId) {
    query.userId = userId
  }
  return this.find(query).sort({ name: 1 })
}

SupplierSchema.statics.getSupplierStats = function(userId?: string) {
  const matchStage: Record<string, any> = {}
  if (userId) {
    matchStage.userId = new mongoose.Types.ObjectId(userId)
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$country',
        totalSuppliers: { $sum: 1 },
        verifiedSuppliers: {
          $sum: { $cond: ['$isVerified', 1, 0] }
        }
      }
    },
    { $sort: { totalSuppliers: -1 } }
  ])
}

// Méthodes d'instance
SupplierSchema.methods.addCarbonIntensityData = function(data: Omit<ICarbonIntensityData, 'verifiedAt'>) {
  // Supprimer les données existantes pour ce secteur
  this.carbonIntensityData = this.carbonIntensityData.filter(
    (item: ICarbonIntensityData) => item.sector !== data.sector
  )
  
  // Ajouter les nouvelles données
  this.carbonIntensityData.push({
    ...data,
    verifiedAt: new Date()
  })
  
  return this.save()
}

SupplierSchema.methods.getCarbonIntensityBySector = function(sector: CbamSector): ICarbonIntensityData | null {
  return this.carbonIntensityData.find((data: ICarbonIntensityData) => data.sector === sector) || null
}

SupplierSchema.methods.removeCarbonIntensityData = function(sector: CbamSector) {
  this.carbonIntensityData = this.carbonIntensityData.filter(
    (data: ICarbonIntensityData) => data.sector !== sector
  )
  return this.save()
}

SupplierSchema.methods.hasDataForSector = function(sector: CbamSector): boolean {
  return this.carbonIntensityData.some((data: ICarbonIntensityData) => data.sector === sector)
}

SupplierSchema.methods.verify = function() {
  this.isVerified = true
  return this.save()
}

SupplierSchema.methods.unverify = function() {
  this.isVerified = false
  return this.save()
}

SupplierSchema.methods.getFullAddress = function(): string {
  const parts = [this.address, this.country].filter(Boolean)
  return parts.join(', ')
}

SupplierSchema.methods.getContactInfo = function(): string {
  const contacts = []
  if (this.contactEmail) contacts.push(this.contactEmail)
  if (this.contactPhone) contacts.push(this.contactPhone)
  return contacts.join(' | ')
}

SupplierSchema.methods.getSectors = function(): CbamSector[] {
  return this.carbonIntensityData.map((data: ICarbonIntensityData) => data.sector)
}

SupplierSchema.methods.getLatestVerificationDate = function(): Date | null {
  if (this.carbonIntensityData.length === 0) return null
  
  return this.carbonIntensityData.reduce((latest: Date, data: ICarbonIntensityData) => {
    return data.verifiedAt > latest ? data.verifiedAt : latest
  }, this.carbonIntensityData[0].verifiedAt)
}

SupplierSchema.methods.isDataExpired = function(sector: CbamSector, monthsValid = 12): boolean {
  const data = this.getCarbonIntensityBySector(sector)
  if (!data) return true
  
  const expirationDate = new Date(data.verifiedAt)
  expirationDate.setMonth(expirationDate.getMonth() + monthsValid)
  
  return new Date() > expirationDate
}

SupplierSchema.methods.getValidSectors = function(monthsValid = 12): CbamSector[] {
  return this.carbonIntensityData
    .filter((data: ICarbonIntensityData) => !this.isDataExpired(data.sector, monthsValid))
    .map((data: ICarbonIntensityData) => data.sector)
}

SupplierSchema.methods.validateSupplierData = function(): string[] {
  const errors: string[] = []
  
  if (!this.name.trim()) {
    errors.push('Le nom du fournisseur est requis')
  }
  
  if (!this.country.trim()) {
    errors.push('Le pays est requis')
  }
  
  if (this.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contactEmail)) {
    errors.push('L\'email de contact n\'est pas valide')
  }
  
  // Vérifier la validité des données d'intensité carbone
  this.carbonIntensityData.forEach((data: ICarbonIntensityData, index: number) => {
    if (data.value < 0) {
      errors.push(`L'intensité carbone pour le secteur ${data.sector} ne peut pas être négative`)
    }
    if (data.value > 1000) {
      errors.push(`L'intensité carbone pour le secteur ${data.sector} ne peut pas dépasser 1000 tCO2e/tonne`)
    }
  })
  
  return errors
}

export default mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema)