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
  Users,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Building
} from 'lucide-react'
import { SupplierWithCarbonData, PaginatedResponse } from '@/types/cbam'
import { useToast } from '@/hooks/use-toast'

interface SupplierFilters {
  country?: string
  isVerified?: boolean
  search?: string
}

export default function SuppliersPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  const [suppliers, setSuppliers] = useState<SupplierWithCarbonData[]>([])
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
  
  const [filters, setFilters] = useState<SupplierFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [countries, setCountries] = useState<string[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session?.user?.id) {
      fetchSuppliers()
      fetchCountries()
    }
  }, [session, pagination.page, filters])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: 'name',
        sortOrder: 'asc'
      })

      if (filters.country) params.set('country', filters.country)
      if (filters.isVerified !== undefined) params.set('isVerified', filters.isVerified.toString())
      if (filters.search) params.set('search', filters.search)

      const response = await fetch(`/api/suppliers?${params}`)
      const result = await response.json()

      if (result.success) {
        const data: PaginatedResponse<SupplierWithCarbonData> = result.data
        setSuppliers(data.data)
        setPagination(data.pagination)
      } else {
        setError(result.error || 'Erreur lors du chargement des fournisseurs')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/suppliers/countries')
      const result = await response.json()
      
      if (result.success) {
        setCountries(result.data)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des pays:', err)
    }
  }

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm })
    setPagination({ ...pagination, page: 1 })
  }

  const handleFilterChange = (key: keyof SupplierFilters, value: any) => {
    setFilters({ ...filters, [key]: value })
    setPagination({ ...pagination, page: 1 })
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    setPagination({ ...pagination, page: 1 })
  }

  const deleteSupplier = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Fournisseur supprimé avec succès'
        })
        fetchSuppliers()
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
    return <SuppliersSkeleton />
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fournisseurs</h1>
          <p className="text-muted-foreground">
            Gérez votre annuaire de fournisseurs et leurs données carbone
          </p>
        </div>
        <Link href="/dashboard/suppliers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau fournisseur
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

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total fournisseurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">
              Fournisseurs enregistrés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vérifiés</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.filter(s => s.isVerified).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Fournisseurs vérifiés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pays</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countries.length}</div>
            <p className="text-xs text-muted-foreground">
              Pays représentés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avec données carbone</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.filter(s => s.carbonIntensityData && s.carbonIntensityData.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Données carbone disponibles
            </p>
          </CardContent>
        </Card>
      </div>

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
                  placeholder="Rechercher par nom ou pays..."
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
              value={filters.country || ''} 
              onValueChange={(value) => handleFilterChange('country', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les pays</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.isVerified?.toString() || ''} 
              onValueChange={(value) => handleFilterChange('isVerified', value ? value === 'true' : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vérification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="true">Vérifiés</SelectItem>
                <SelectItem value="false">Non vérifiés</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Effacer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des fournisseurs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Fournisseurs ({pagination.total})
            </CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              Page {pagination.page} sur {pagination.totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun fournisseur</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter vos premiers fournisseurs
              </p>
              <Link href="/dashboard/suppliers/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un fournisseur
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Données carbone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          {supplier.registrationNumber && (
                            <p className="text-sm text-muted-foreground">
                              {supplier.registrationNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {supplier.country}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {supplier.contactEmail && (
                            <p>{supplier.contactEmail}</p>
                          )}
                          {supplier.contactPhone && (
                            <p className="text-muted-foreground">{supplier.contactPhone}</p>
                          )}
                          {!supplier.contactEmail && !supplier.contactPhone && (
                            <p className="text-muted-foreground">Aucun contact</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <VerificationBadge isVerified={supplier.isVerified} />
                      </TableCell>
                      <TableCell>
                        <CarbonDataIndicator supplier={supplier} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/suppliers/${supplier.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/suppliers/${supplier.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteSupplier(supplier.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Conseils */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Conseils pour la gestion des fournisseurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Optimisez votre annuaire</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Ajoutez les informations de contact complètes</li>
                <li>• Demandez les certificats d'émissions carbone</li>
                <li>• Vérifiez régulièrement les données</li>
                <li>• Maintenez les informations à jour</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Données carbone</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Demandez les certificats officiels</li>
                <li>• Vérifiez la validité des données</li>
                <li>• Mettez à jour annuellement</li>
                <li>• Privilégiez les fournisseurs vérifiés</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VerificationBadge({ isVerified }: { isVerified: boolean }) {
  return (
    <Badge variant={isVerified ? 'secondary' : 'outline'} className="flex items-center gap-1 w-fit">
      {isVerified ? (
        <>
          <CheckCircle className="h-3 w-3" />
          Vérifié
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3" />
          Non vérifié
        </>
      )}
    </Badge>
  )
}

function CarbonDataIndicator({ supplier }: { supplier: SupplierWithCarbonData }) {
  const hasData = supplier.carbonIntensityData && supplier.carbonIntensityData.length > 0
  const sectorsCount = hasData ? supplier.carbonIntensityData?.length : 0

  if (!hasData) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Aucune donnée
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      {sectorsCount} secteur{sectorsCount ? sectorsCount : 0 > 1 ? 's' : ''}
    </Badge>
  )
}

function SuppliersSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
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
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
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