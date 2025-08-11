'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Plus,
  FileText,
  Calendar,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Upload
} from 'lucide-react'
import { formatCurrency, formatCO2, formatDate, getDaysUntilDeadline } from '@/lib/utils'
import { CbamDeclaration, CbamImport } from '@/types/cbam'
import { useToast } from '@/hooks/use-toast'

interface DeclarationWithImports extends CbamDeclaration {
  imports: CbamImport[]
}

export default function DeclarationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  const [declaration, setDeclaration] = useState<DeclarationWithImports | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const declarationId = params.id as string

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session?.user?.id && declarationId) {
      fetchDeclaration()
    }
  }, [session, declarationId])

  const fetchDeclaration = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/declarations/${declarationId}`)
      const result = await response.json()

      if (result.success) {
        setDeclaration(result.data)
      } else {
        setError(result.error || 'Déclaration non trouvée')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitDeclaration = async () => {
    if (!declaration) return

    try {
      setActionLoading(true)

      const response = await fetch(`/api/declarations/${declarationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'submitted'
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Déclaration soumise avec succès'
        })
        setDeclaration(result.data)
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de la soumission',
          variant: 'destructive'
        })
      }
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Erreur de connexion',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteDeclaration = async () => {
    if (!declaration) return

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette déclaration ?')) {
      return
    }

    try {
      setActionLoading(true)

      const response = await fetch(`/api/declarations/${declarationId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Déclaration supprimée avec succès'
        })
        router.push('/dashboard/declarations')
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
    } finally {
      setActionLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <DeclarationDetailSkeleton />
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/dashboard/declarations">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux déclarations
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!declaration) {
    return null
  }

  const daysUntilDeadline = getDaysUntilDeadline(new Date(declaration.deadlineDate))
  const isOverdue = daysUntilDeadline < 0
  const isUrgent = daysUntilDeadline <= 30 && daysUntilDeadline >= 0
  const canEdit = declaration.status === 'draft' || declaration.status === 'rejected'
  const canSubmit = declaration.status === 'draft' && declaration.summary.totalImports > 0

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/declarations" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux déclarations
        </Link>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Link href={`/dashboard/declarations/${declarationId}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDeleteDeclaration}
                disabled={actionLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </>
          )}
          {canSubmit && (
            <Button 
              onClick={handleSubmitDeclaration}
              disabled={actionLoading}
            >
              {actionLoading ? 'Soumission...' : 'Soumettre'}
            </Button>
          )}
        </div>
      </div>

      {/* En-tête de la déclaration */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                Déclaration T{declaration.reportingPeriod.quarter} {declaration.reportingPeriod.year}
              </CardTitle>
              <CardDescription>
                Déclaration CBAM pour la période du trimestre {declaration.reportingPeriod.quarter} de l'année {declaration.reportingPeriod.year}
              </CardDescription>
            </div>
            <StatusBadge status={declaration.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Créée le</p>
                <p className="font-medium">{formatDate(declaration.createdAt)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Échéance</p>
                <p className={`font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : ''}`}>
                  {formatDate(declaration.deadlineDate)}
                </p>
                {!['validated', 'submitted'].includes(declaration.status) && (
                  <p className={`text-xs ${isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-muted-foreground'}`}>
                    {isOverdue 
                      ? `En retard de ${Math.abs(daysUntilDeadline)} jour${Math.abs(daysUntilDeadline) > 1 ? 's' : ''}`
                      : `Dans ${daysUntilDeadline} jour${daysUntilDeadline > 1 ? 's' : ''}`
                    }
                  </p>
                )}
              </div>
            </div>
            
            {declaration.submittedAt && (
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Soumise le</p>
                  <p className="font-medium">{formatDate(declaration.submittedAt)}</p>
                </div>
              </div>
            )}
            
            {declaration.validatedAt && (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Validée le</p>
                  <p className="font-medium">{formatDate(declaration.validatedAt)}</p>
                </div>
              </div>
            )}
          </div>

          {declaration.rejectionReason && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Motif de rejet :</strong> {declaration.rejectionReason}
              </AlertDescription>
            </Alert>
          )}

          {declaration.notes && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground">{declaration.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résumé statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Importations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{declaration.summary.totalImports}</div>
            <p className="text-xs text-muted-foreground">
              {formatCO2(declaration.summary.totalQuantity)} au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(declaration.summary.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Valeur des importations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Émissions carbone</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCO2(declaration.summary.totalEmissions, 't')}</div>
            <p className="text-xs text-muted-foreground">
              Émissions totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificats CBAM</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {declaration.summary.totalCertificatesHeld}/{declaration.summary.totalCertificatesRequired}
            </div>
            <p className="text-xs text-muted-foreground">
              Détenus/Requis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets de contenu */}
      <Tabs defaultValue="imports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="imports">Importations ({declaration.imports.length})</TabsTrigger>
          <TabsTrigger value="summary">Résumé</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="imports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Liste des importations</CardTitle>
                {canEdit && (
                  <Link href={`/dashboard/declarations/${declarationId}/imports/new`}>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une importation
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {declaration.imports.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune importation</h3>
                  <p className="text-muted-foreground mb-4">
                    Commencez par ajouter vos importations pour cette période
                  </p>
                  {canEdit && (
                    <Link href={`/dashboard/declarations/${declarationId}/imports/new`}>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une importation
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Émissions</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {declaration.imports.map((importItem) => (
                      <TableRow key={importItem.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{importItem.product?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              CN {importItem.product?.cnCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{importItem.supplierName}</p>
                            <p className="text-sm text-muted-foreground">
                              {importItem.supplierCountry}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{formatCO2(importItem.quantity)}</TableCell>
                        <TableCell>{formatCurrency(importItem.totalValue)}</TableCell>
                        <TableCell>{formatCO2(importItem.carbonEmissions, 't')}</TableCell>
                        <TableCell>
                          <ImportStatusBadge status={importItem.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Résumé de la déclaration</CardTitle>
              <CardDescription>
                Vue d'ensemble détaillée de votre déclaration CBAM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium">Période de déclaration</h4>
                    <p className="text-sm text-muted-foreground">
                      Trimestre {declaration.reportingPeriod.quarter} de l'année {declaration.reportingPeriod.year}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Statut actuel</h4>
                    <StatusBadge status={declaration.status} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Statistiques</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{declaration.summary.totalImports}</p>
                      <p className="text-sm text-muted-foreground">Importations</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{formatCO2(declaration.summary.totalQuantity)}</p>
                      <p className="text-sm text-muted-foreground">Quantité totale</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{formatCurrency(declaration.summary.totalValue)}</p>
                      <p className="text-sm text-muted-foreground">Valeur totale</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Conformité carbone</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Émissions totales</span>
                        <span className="font-medium">{formatCO2(declaration.summary.totalEmissions, 't')}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Certificats requis</span>
                        <span className="font-medium">{declaration.summary.totalCertificatesRequired}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Certificats détenus</span>
                        <span className="font-medium">{declaration.summary.totalCertificatesHeld}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Déficit</span>
                        <span className={`font-medium ${
                          declaration.summary.totalCertificatesRequired - declaration.summary.totalCertificatesHeld > 0 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {Math.max(0, declaration.summary.totalCertificatesRequired - declaration.summary.totalCertificatesHeld)}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h5 className="font-medium mb-2">Statut de conformité</h5>
                      {declaration.summary.totalCertificatesRequired - declaration.summary.totalCertificatesHeld <= 0 ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Conforme</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">Non conforme - Certificats manquants</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents associés</CardTitle>
              <CardDescription>
                Documents et pièces justificatives de la déclaration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun document</h3>
                <p className="text-muted-foreground mb-4">
                  Les documents sont associés aux importations individuelles
                </p>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Générer le rapport PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    draft: { variant: 'outline' as const, icon: Edit, label: 'Brouillon' },
    submitted: { variant: 'default' as const, icon: Clock, label: 'Soumise' },
    validated: { variant: 'secondary' as const, icon: CheckCircle, label: 'Validée' },
    rejected: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Rejetée' },
    pending: { variant: 'default' as const, icon: Clock, label: 'En attente' }
  }

  const config = variants[status as keyof typeof variants] || variants.draft
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function ImportStatusBadge({ status }: { status: string }) {
  const variants = {
    pending: { variant: 'outline' as const, label: 'En attente' },
    processing: { variant: 'default' as const, label: 'En cours' },
    completed: { variant: 'secondary' as const, label: 'Terminé' },
    error: { variant: 'destructive' as const, label: 'Erreur' }
  }

  const config = variants[status as keyof typeof variants] || variants.pending

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}

function DeclarationDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}