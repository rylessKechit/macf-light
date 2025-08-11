'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react'
import { formatCurrency, formatCO2, formatDate, getDaysUntilDeadline } from '@/lib/utils'
import { CbamDeclaration, DeclarationStatus, PaginatedResponse } from '@/types/cbam'
import { useToast } from '@/hooks/use-toast'

interface DeclarationFilters {
  status?: DeclarationStatus
  year?: number
  quarter?: number
  search?: string
}

export default function DeclarationsPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  const [declarations, setDeclarations] = useState<CbamDeclaration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  
  const [filters, setFilters] = useState<DeclarationFilters>({})
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDeclarations()
    }
  }, [session, pagination.page, filters])

  const fetchDeclarations = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })

      if (filters.status) params.set('status', filters.status)
      if (filters.year) params.set('year', filters.year.toString())
      if (filters.quarter) params.set('quarter', filters.quarter.toString())
      if (filters.search) params.set('search', filters.search)

      const response = await fetch(`/api/declarations?${params}`)
      const result = await response.json()

      if (result.success) {
        const data: PaginatedResponse<CbamDeclaration> = result.data
        setDeclarations(data.data)
        setPagination(data.pagination)
      } else {
        setError(result.error || 'Erreur lors du chargement des déclarations')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm })
    setPagination({ ...pagination, page: 1 })
  }

  const handleFilterChange = (key: keyof DeclarationFilters, value: any) => {
    setFilters({ ...filters, [key]: value })
    setPagination({ ...pagination, page: 1 })
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    setPagination({ ...pagination, page: 1 })
  }

  const deleteDeclaration = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette déclaration ?')) {
      return
    }

    try {
      const response = await fetch(`/api/declarations/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Déclaration supprimée avec succès'
        })
        fetchDeclarations()
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de la suppression',
          variant: 'destructive'
        })
      }
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Erreur de connexion',
        variant: 'destructive'
      })
    }
  }

  if (status === 'loading' || loading) {
    return <DeclarationsSkeleton />
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Déclarations CBAM</h1>
          <p className="text-muted-foreground">
            Gérez vos déclarations trimestrielles
          </p>
        </div>
        <Link href="/dashboard/declarations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle déclaration
          </Button>
        </Link>
      </div>

      {/* Erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Select 
              value={filters.status || ''} 
              onValueChange={(value) => handleFilterChange('status', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="submitted">Soumise</SelectItem>
                <SelectItem value="validated">Validée</SelectItem>
                <SelectItem value="rejected">Rejetée</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.year?.toString() || ''} 
              onValueChange={(value) => handleFilterChange('year', value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les années</SelectItem>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Effacer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des déclarations */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Déclarations ({pagination.total})
            </CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              Page {pagination.page} sur {pagination.totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {declarations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune déclaration</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par créer votre première déclaration CBAM
              </p>
              <Link href="/dashboard/declarations/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle déclaration
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Importations</TableHead>
                    <TableHead>Émissions</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.map((declaration) => (
                    <TableRow key={declaration.id}>
                      <TableCell className="font-medium">
                        T{declaration.reportingPeriod.quarter} {declaration.reportingPeriod.year}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={declaration.status} />
                      </TableCell>
                      <TableCell>
                        {declaration.summary.totalImports}
                      </TableCell>
                      <TableCell>
                        {formatCO2(declaration.summary.totalEmissions, 't')}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(declaration.summary.totalValue)}
                      </TableCell>
                      <TableCell>
                        <DeadlineCell 
                          deadline={declaration.deadlineDate} 
                          status={declaration.status} 
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/declarations/${declaration.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {(declaration.status === 'draft' || declaration.status === 'rejected') && (
                            <>
                              <Link href={`/dashboard/declarations/${declaration.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteDeclaration(declaration.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
                    {pagination.total} résultats
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasPrev}
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasNext}
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: DeclarationStatus }) {
  const variants: Record<DeclarationStatus, { variant: "default" | "secondary" | "destructive" | "outline", icon: JSX.Element }> = {
    draft: { variant: 'outline', icon: <Edit className="h-3 w-3 mr-1" /> },
    submitted: { variant: 'default', icon: <Clock className="h-3 w-3 mr-1" /> },
    validated: { variant: 'secondary', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    rejected: { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
    pending: { variant: 'default', icon: <Clock className="h-3 w-3 mr-1" /> }
  }

  const labels: Record<DeclarationStatus, string> = {
    draft: 'Brouillon',
    submitted: 'Soumise',
    validated: 'Validée',
    rejected: 'Rejetée',
    pending: 'En attente'
  }

  const config = variants[status]
  
  return (
    <Badge variant={config.variant} className="flex items-center w-fit">
      {config.icon}
      {labels[status]}
    </Badge>
  )
}

function DeadlineCell({ deadline, status }: { deadline: string, status: DeclarationStatus }) {
  const deadlineDate = new Date(deadline)
  const daysUntil = getDaysUntilDeadline(deadlineDate)
  const isOverdue = daysUntil < 0
  const isUrgent = daysUntil <= 30 && daysUntil >= 0
  const isCompleted = status === 'validated'

  if (isCompleted) {
    return (
      <div className="flex items-center text-green-600">
        <CheckCircle className="h-4 w-4 mr-1" />
        <span className="text-sm">Validée</span>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="text-sm">{formatDate(deadlineDate)}</div>
      <div className={`text-xs flex items-center ${
        isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-muted-foreground'
      }`}>
        {isOverdue ? (
          <>
            <AlertTriangle className="h-3 w-3 mr-1" />
            En retard de {Math.abs(daysUntil)} jour{Math.abs(daysUntil) > 1 ? 's' : ''}
          </>
        ) : isUrgent ? (
          <>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}
          </>
        ) : (
          <>
            <Calendar className="h-3 w-3 mr-1" />
            Dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}
          </>
        )}
      </div>
    </div>
  )
}

function DeclarationsSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}