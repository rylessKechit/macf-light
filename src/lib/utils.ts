import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utilitaires pour les formats français
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatNumber(number: number): string {
  return new Intl.NumberFormat('fr-FR').format(number)
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj)
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

// Utilitaires de validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateSiret(siret: string): boolean {
  // Validation basique SIRET français (14 chiffres)
  const siretRegex = /^\d{14}$/
  return siretRegex.test(siret.replace(/\s/g, ''))
}

// Utilitaires pour les fichiers
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

// Utilitaires pour les émissions carbone
export function formatCO2(amount: number, unit = 'kg'): string {
  if (amount >= 1000 && unit === 'kg') {
    return `${formatNumber(amount / 1000)} t CO₂e`
  }
  return `${formatNumber(amount)} ${unit} CO₂e`
}

// Utilitaires pour les couleurs de statut
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'pending': 'bg-warning',
    'completed': 'bg-success',
    'error': 'bg-destructive',
    'draft': 'bg-muted',
    'submitted': 'bg-info',
    'validated': 'bg-success',
    'rejected': 'bg-destructive',
  }
  return statusColors[status] || 'bg-muted'
}

// Utilitaires pour les deadlines CBAM
export function getNextCbamDeadline(): Date {
  const now = new Date()
  const year = now.getFullYear()
  const quarter = Math.ceil((now.getMonth() + 1) / 3)
  
  // Les deadlines CBAM sont le 31 janvier, 30 avril, 31 juillet, 31 octobre
  const deadlines = [
    new Date(year, 0, 31), // 31 janvier
    new Date(year, 3, 30), // 30 avril
    new Date(year, 6, 31), // 31 juillet
    new Date(year, 9, 31), // 31 octobre
  ]
  
  // Trouver la prochaine deadline
  let nextDeadline = deadlines.find(date => date > now)
  
  // Si aucune deadline cette année, prendre la première de l'année suivante
  if (!nextDeadline) {
    nextDeadline = new Date(year + 1, 0, 31)
  }
  
  return nextDeadline
}

export function getDaysUntilDeadline(deadline: Date): number {
  const now = new Date()
  const diffTime = deadline.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}