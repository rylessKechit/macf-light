import mongoose, { Document, Schema, Types } from 'mongoose'
import { ImportStatus } from '@/types/cbam'

export interface IImportDocument {
  id: string
  name: string
  type: 'invoice' | 'certificate' | 'customs' | 'other'
  url: string
  size: number
  uploadedAt: Date
}

export interface ICbamImport extends Document {
  declarationId: Types.ObjectId
  productId: Types.ObjectId
  supplierName: string
  supplierCountry: string
  quantity: number
  unitValue: number
  totalValue: number
  carbonEmissions: number
  carbonCertificates?: number
  documents: IImportDocument[]
  status: ImportStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const ImportDocumentSchema = new Schema<IImportDocument>({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Le nom du document est requis'],
    trim: true,
    maxlength: [255, 'Le nom ne peut pas dépasser 255 caractères']
  },
  type: {
    type: String,
    enum: ['invoice', 'certificate', 'customs', 'other'],
    required: [true, 'Le type de document est requis']
  },
  url: {
    type: String,
    required: [true, 'L\'URL du document est requise'],
    trim: true
  },
  size: {
    type: Number,
    required: [true, 'La taille du document est requise'],
    min: [0, 'La taille ne peut pas être négative']
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false })

const CbamImportSchema = new Schema<ICbamImport>({
  declarationId: {
    type: Schema.Types.ObjectId,
    ref: 'CbamDeclaration',
    required: [true, 'La déclaration est requise'],
    index: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'CbamProduct',
    required: [true, 'Le produit est requis'],
    index: true
  },
  supplierName: {
    type: String,
    required: [true, 'Le nom du fournisseur est requis'],
    trim: true,
    maxlength: [200, 'Le nom du fournisseur ne peut pas dépasser 200 caractères'],
    index: true
  },
  supplierCountry: {
    type: String,
    required: [true, 'Le pays du fournisseur est requis'],
    trim: true,
    maxlength: [100, 'Le pays ne peut pas dépasser 100 caractères'],
    index: true
  },
  quantity: {
    type: Number,
    required: [true, 'La quantité est requise'],
    min: [0.001, 'La quantité doit être supérieure à 0'],
    max: [1000000, 'La quantité ne peut pas dépasser 1,000,000 tonnes']
  },
  unitValue: {
    type: Number,
    required: [true, 'La valeur unitaire est requise'],
    min: [0.01, 'La valeur unitaire doit être supérieure à 0'],
    max: [1000000, 'La valeur unitaire ne peut pas dépasser 1,000,000 €/tonne']
  },
  totalValue: {
    type: Number,
    required: [true, 'La valeur totale est requise'],
    min: [0.01, 'La valeur totale doit être supérieure à 0']
  },
  carbonEmissions: {
    type: Number,
    required: [true, 'Les émissions carbone sont requises'],
    min: [0, 'Les émissions ne peuvent pas être négatives'],
    max: [1000000, 'Les émissions ne peuvent pas dépasser 1,000,000 tCO2e']
  },
  carbonCertificates: {
    type: Number,
    min: [0, 'Le nombre de certificats ne peut pas être négatif'],
    max: [1000000, 'Le nombre de certificats ne peut pas dépasser 1,000,000']
  },
  documents: [ImportDocumentSchema],
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'error'],
    default: 'pending',
    index: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Les notes ne peuvent pas dépasser 1000 caractères']
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

// Index composé pour les recherches optimisées
CbamImportSchema.index({ declarationId: 1, status: 1 })
CbamImportSchema.index({ declarationId: 1, createdAt: -1 })
CbamImportSchema.index({ productId: 1, supplierCountry: 1 })
CbamImportSchema.index({ supplierName: 1, supplierCountry: 1 })

// Validation personnalisée pour s'assurer que totalValue = quantity * unitValue
CbamImportSchema.pre('validate', function() {
  const expectedTotal = this.quantity * this.unitValue
  const tolerance = 0.01 // Tolérance de 1 centime pour les arrondis
  
  if (Math.abs(this.totalValue - expectedTotal) > tolerance) {
    this.totalValue = expectedTotal
  }
})

// Méthodes statiques
CbamImportSchema.statics.findByDeclaration = function(declarationId: string) {
  return this.find({ declarationId })
    .populate('productId', 'name cnCode sector carbonIntensity')
    .sort({ createdAt: -1 })
}

CbamImportSchema.statics.findByProduct = function(productId: string) {
  return this.find({ productId })
    .populate('declarationId', 'reportingPeriod status')
    .populate('productId', 'name cnCode sector')
    .sort({ createdAt: -1 })
}

CbamImportSchema.statics.findBySupplier = function(supplierName: string, supplierCountry?: string) {
  const query: Record<string, any> = { supplierName: new RegExp(supplierName, 'i') }
  if (supplierCountry) {
    query.supplierCountry = supplierCountry
  }
  return this.find(query)
    .populate('productId', 'name cnCode sector')
    .populate('declarationId', 'reportingPeriod status')
    .sort({ createdAt: -1 })
}

CbamImportSchema.statics.getStatsByDeclaration = function(declarationId: string) {
  return this.aggregate([
    { $match: { declarationId: new mongoose.Types.ObjectId(declarationId) } },
    {
      $group: {
        _id: null,
        totalImports: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalValue' },
        totalEmissions: { $sum: '$carbonEmissions' },
        totalCertificates: { $sum: '$carbonCertificates' },
        avgUnitValue: { $avg: '$unitValue' }
      }
    }
  ])
}

CbamImportSchema.statics.getStatsByCountry = function(declarationId?: string) {
  const matchStage: Record<string, any> = {}
  if (declarationId) {
    matchStage.declarationId = new mongoose.Types.ObjectId(declarationId)
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$supplierCountry',
        totalImports: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalValue' },
        totalEmissions: { $sum: '$carbonEmissions' }
      }
    },
    { $sort: { totalValue: -1 } }
  ])
}

CbamImportSchema.statics.getStatsBySector = function(declarationId?: string) {
  const pipeline: any[] = [
    {
      $lookup: {
        from: 'cbamproducts',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' }
  ]
  
  if (declarationId) {
    pipeline.unshift({ $match: { declarationId: new mongoose.Types.ObjectId(declarationId) } })
  }
  
  pipeline.push(
    {
      $group: {
        _id: '$product.sector',
        totalImports: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalValue' },
        totalEmissions: { $sum: '$carbonEmissions' }
      }
    },
    { $sort: { totalEmissions: -1 } }
  )
  
  return this.aggregate(pipeline)
}

// Méthodes d'instance
CbamImportSchema.methods.calculateCertificatesRequired = function(): number {
  // 1 certificat CBAM = 1 tonne de CO2 équivalent
  return Math.ceil(this.carbonEmissions)
}

CbamImportSchema.methods.getCertificateDeficit = function(): number {
  const required = this.calculateCertificatesRequired()
  const held = this.carbonCertificates || 0
  return Math.max(0, required - held)
}

CbamImportSchema.methods.isCompliant = function(): boolean {
  return this.getCertificateDeficit() === 0
}

CbamImportSchema.methods.addDocument = function(document: Omit<IImportDocument, 'id' | 'uploadedAt'>) {
  const newDocument: IImportDocument = {
    ...document,
    id: new mongoose.Types.ObjectId().toString(),
    uploadedAt: new Date()
  }
  
  this.documents.push(newDocument)
  return this.save()
}

CbamImportSchema.methods.removeDocument = function(documentId: string) {
  this.documents = this.documents.filter((doc: IImportDocument) => doc.id !== documentId)
  return this.save()
}

CbamImportSchema.methods.getDocumentsByType = function(type: 'invoice' | 'certificate' | 'customs' | 'other') {
  return this.documents.filter((doc: IImportDocument) => doc.type === type)
}

CbamImportSchema.methods.hasRequiredDocuments = function(): boolean {
  // Vérifier qu'il y a au moins une facture et un certificat d'émissions
  const hasInvoice = this.documents.some((doc: IImportDocument) => doc.type === 'invoice')
  const hasCertificate = this.documents.some((doc: IImportDocument) => doc.type === 'certificate')
  return hasInvoice && hasCertificate
}

CbamImportSchema.methods.getStatusLabel = function(): string {
  const statusLabels: Record<ImportStatus, string> = {
    pending: 'En attente',
    processing: 'En cours de traitement',
    completed: 'Terminé',
    error: 'Erreur'
  }
  return statusLabels[this.status as ImportStatus]
}

CbamImportSchema.methods.validateData = function(): string[] {
  const errors: string[] = []
  
  if (this.quantity <= 0) {
    errors.push('La quantité doit être supérieure à 0')
  }
  
  if (this.unitValue <= 0) {
    errors.push('La valeur unitaire doit être supérieure à 0')
  }
  
  if (this.carbonEmissions < 0) {
    errors.push('Les émissions carbone ne peuvent pas être négatives')
  }
  
  if (this.carbonCertificates !== undefined && this.carbonCertificates < 0) {
    errors.push('Le nombre de certificats ne peut pas être négatif')
  }
  
  if (!this.hasRequiredDocuments()) {
    errors.push('Une facture et un certificat d\'émissions sont requis')
  }
  
  return errors
}

// Middleware pour mettre à jour le résumé de la déclaration après modification
CbamImportSchema.post('save', async function() {
  const CbamDeclaration = mongoose.models.CbamDeclaration
  const declaration = await CbamDeclaration.findById(this.declarationId)
  if (declaration) {
    await declaration.updateSummary()
  }
})

CbamImportSchema.post('deleteOne', { document: true, query: false }, async function() {
  const CbamDeclaration = mongoose.models.CbamDeclaration
  const declaration = await CbamDeclaration.findById(this.declarationId)
  if (declaration) {
    await declaration.updateSummary()
  }
})

CbamImportSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const CbamDeclaration = mongoose.models.CbamDeclaration
    const declaration = await CbamDeclaration.findById(doc.declarationId)
    if (declaration) {
      await declaration.updateSummary()
    }
  }
})

export default mongoose.models.CbamImport || mongoose.model<ICbamImport>('CbamImport', CbamImportSchema)