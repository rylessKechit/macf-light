// Types pour les secteurs CBAM
export type CbamSector = 'cement' | 'iron_steel' | 'aluminum' | 'fertilizers' | 'electricity' | 'hydrogen'

// Types pour les statuts
export type DeclarationStatus = 'draft' | 'submitted' | 'validated' | 'rejected' | 'pending'
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'error'

// Interface pour les produits CBAM
export interface CbamProduct {
  id: string
  name: string
  cnCode: string // Code NC (nomenclature combinée)
  sector: CbamSector
  carbonIntensity: number // tCO2e/tonne
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Interface pour les importations
export interface CbamImport {
  id: string
  declarationId: string
  productId: string
  product?: CbamProduct
  supplierName: string
  supplierCountry: string
  quantity: number // tonnes
  unitValue: number // €/tonne
  totalValue: number // €
  carbonEmissions: number // tCO2e
  carbonCertificates?: number // Certificats CBAM détenus
  documents: ImportDocument[]
  status: ImportStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

// Interface pour les documents d'import
export interface ImportDocument {
  id: string
  name: string
  type: 'invoice' | 'certificate' | 'customs' | 'other'
  url: string
  size: number
  uploadedAt: string
}

// Interface pour les déclarations CBAM
export interface CbamDeclaration {
  id: string
  userId: string
  user?: {
    id: string
    name: string
    email: string
    company: string
  }
  reportingPeriod: {
    quarter: 1 | 2 | 3 | 4
    year: number
  }
  status: DeclarationStatus
  imports: CbamImport[]
  summary: {
    totalImports: number // nombre d'importations
    totalQuantity: number // tonnes total
    totalValue: number // € total
    totalEmissions: number // tCO2e total
    totalCertificatesRequired: number // Certificats CBAM requis
    totalCertificatesHeld: number // Certificats CBAM détenus
  }
  deadlineDate: string
  submittedAt?: string
  validatedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Interface pour les fournisseurs
export interface Supplier {
  id: string
  userId: string
  name: string
  country: string
  address?: string
  contactEmail?: string
  contactPhone?: string
  registrationNumber?: string
  isVerified: boolean
  carbonIntensityData?: {
    sector: CbamSector
    value: number // tCO2e/tonne
    verifiedAt: string
    certificate?: string
  }[]
  createdAt: string
  updatedAt: string
}

// Interface pour les statistiques du dashboard
export interface DashboardStats {
  totalDeclarations: number
  pendingDeclarations: number
  completedDeclarations: number
  totalImports: number
  totalEmissions: number // tCO2e
  totalValue: number // €
  nextDeadline: string
  recentActivity: ActivityItem[]
}

// Interface pour les activités récentes
export interface ActivityItem {
  id: string
  type: 'declaration_created' | 'declaration_submitted' | 'import_added' | 'declaration_validated'
  description: string
  date: string
  relatedId?: string
}

// Interface pour les formulaires
export interface CreateDeclarationForm {
  quarter: 1 | 2 | 3 | 4
  year: number
}

export interface ImportForm {
  productId: string
  supplierName: string
  supplierCountry: string
  quantity: number
  unitValue: number
  carbonEmissions: number
  carbonCertificates?: number
  notes?: string
}

export interface ProductForm {
  name: string
  cnCode: string
  sector: CbamSector
  carbonIntensity: number
  description?: string
}

export interface SupplierForm {
  name: string
  country: string
  address?: string
  contactEmail?: string
  contactPhone?: string
  registrationNumber?: string
}

// Interface pour les rapports
export interface CbamReport {
  declarationId: string
  reportType: 'summary' | 'detailed' | 'compliance'
  generatedAt: string
  data: {
    period: {
      quarter: number
      year: number
    }
    company: {
      name: string
      registrationNumber?: string
    }
    summary: {
      totalImports: number
      totalQuantity: number
      totalValue: number
      totalEmissions: number
      certificatesRequired: number
      certificatesHeld: number
      complianceStatus: 'compliant' | 'non_compliant' | 'pending'
    }
    imports: CbamImport[]
  }
}

// Types pour la pagination
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errors?: Record<string, string[]>
}

// Types pour les filtres de recherche
export interface DeclarationFilters {
  status?: DeclarationStatus[]
  year?: number
  quarter?: number[]
  search?: string
}

export interface ImportFilters {
  sector?: CbamSector[]
  country?: string[]
  supplier?: string
  search?: string
}

// Types pour l'export de données
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf'
  includeDetails: boolean
  dateRange?: {
    start: string
    end: string
  }
}