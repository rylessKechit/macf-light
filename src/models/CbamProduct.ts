import mongoose, { Document, Schema } from 'mongoose'
import { CbamSector } from '@/types/cbam'

export interface ICbamProduct extends Document {
  name: string
  cnCode: string
  sector: CbamSector
  carbonIntensity: number
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const CbamProductSchema = new Schema<ICbamProduct>({
  name: {
    type: String,
    required: [true, 'Le nom du produit est requis'],
    trim: true,
    maxlength: [200, 'Le nom ne peut pas dépasser 200 caractères']
  },
  cnCode: {
    type: String,
    required: [true, 'Le code NC est requis'],
    trim: true,
    match: [/^\d{8}$/, 'Le code NC doit contenir exactement 8 chiffres'],
    index: true
  },
  sector: {
    type: String,
    enum: ['cement', 'iron_steel', 'aluminum', 'fertilizers', 'electricity', 'hydrogen'],
    required: [true, 'Le secteur est requis'],
    index: true
  },
  carbonIntensity: {
    type: Number,
    required: [true, 'L\'intensité carbone est requise'],
    min: [0, 'L\'intensité carbone ne peut pas être négative'],
    max: [1000, 'L\'intensité carbone ne peut pas dépasser 1000 tCO2e/tonne']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
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

// Index composé pour éviter les doublons de codes NC
CbamProductSchema.index({ cnCode: 1 }, { unique: true })

// Index pour les recherches
CbamProductSchema.index({ name: 'text', description: 'text' })
CbamProductSchema.index({ sector: 1, isActive: 1 })

// Méthodes statiques
CbamProductSchema.statics.findBySector = function(sector: CbamSector) {
  return this.find({ sector, isActive: true }).sort({ name: 1 })
}

CbamProductSchema.statics.findByCnCode = function(cnCode: string) {
  return this.findOne({ cnCode, isActive: true })
}

CbamProductSchema.statics.searchProducts = function(query: string) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { cnCode: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  }).sort({ name: 1 })
}

// Méthodes d'instance
CbamProductSchema.methods.calculateEmissions = function(quantity: number): number {
  return quantity * this.carbonIntensity
}

CbamProductSchema.methods.getSectorLabel = function(): string {
  const sectorLabels: Record<CbamSector, string> = {
    cement: 'Ciment',
    iron_steel: 'Fer et acier',
    aluminum: 'Aluminium',
    fertilizers: 'Engrais',
    electricity: 'Électricité',
    hydrogen: 'Hydrogène'
  }
  return sectorLabels[this.sector as CbamSector]
}

export default mongoose.models.CbamProduct || mongoose.model<ICbamProduct>('CbamProduct', CbamProductSchema)