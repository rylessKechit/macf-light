'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { 
  ArrowLeft, 
  Save,
  Trash2,
  AlertTriangle,
  Info,
  Calculator
} from 'lucide-react'
import { formatCurrency, formatCO2, formatDate } from '@/lib/utils'
import { CbamDeclaration, ImportWithProduct } from '@/types/cbam'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  supplierName: z.string().min(1, 'Le nom du fournisseur est requis').max(200),
  supplierCountry: z.string().min(1, 'Le pays du fournisseur est requis').max(100),
  quantity: z.coerce.number().min(0.001, 'La quantité doit être supérieure à 0').max(1000000),
  unitValue: z.coerce.number().min(0.01, 'La valeur unitaire doit être supérieure à 0').max(1000000),
  carbonEmissions: z.coerce.number().min(0, 'Les émissions ne peuvent pas être négatives').max(1000000),
  carbonCertificates: z.coerce.number().min(0, 'Le nombre de certificats ne peut pas être négatif').max(1000000).optional(),
  notes: z.string().max(1000, 'Les notes ne peuvent pas dépasser 1000 caractères').optional()
})

type FormData = z.infer<typeof formSchema>

const countries = [
  'Chine', 'Russie', 'Inde', 'Turquie', 'Ukraine', 'Kazakhstan', 'Brésil',
  'États-Unis', 'Canada', 'Australie', 'Afrique du Sud', 'Algérie', 'Maroc',
  'Égypte', 'Tunisie', 'Norvège', 'Suisse', 'Royaume-Uni', 'Autre'
].sort()

export default function EditImportPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  const [declaration, setDeclaration] = useState<CbamDeclaration | null>(null)
  const [importItem, setImportItem] = useState<ImportWithProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const declarationId = params.id as string
  const importId = params.importId as string

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierName: '',
      supplierCountry: '',
      quantity: 0,
      unitValue: 0,
      carbonEmissions: 0,
      carbonCertificates: 0,
      notes: ''
    }
  })

  const watchedQuantity = form.watch('quantity')
  const watchedUnitValue = form.watch('unitValue')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session?.user?.id && declarationId && importId) {
      fetchData()
    }
  }, [session, declarationId, importId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Récupérer la déclaration et l'importation
      const [declarationResponse, importResponse] = await Promise.all([
        fetch(`/api/declarations/${declarationId}`),
        fetch(`/api/declarations/${declarationId}/imports/${importId}`)
      ])

      const declarationResult = await declarationResponse.json()
      const importResult = await importResponse.json()

      if (declarationResult.success) {
        const declarationData = declarationResult.data
        setDeclaration(declarationData)

        // Vérifier si la déclaration peut être modifiée
        if (declarationData.status !== 'draft' && declarationData.status !== 'rejected') {
          setError('Cette déclaration ne peut pas être modifiée')
          return
        }
      } else {
        setError(declarationResult.error || 'Déclaration non trouvée')
        return
      }

      if (importResult.success) {
        const importData = importResult.data
        setImportItem(importData)

        // Pré-remplir le formulaire
        form.reset({
          supplierName: importData.supplierName,
          supplierCountry: importData.supplierCountry,
          quantity: importData.quantity,
          unitValue: importData.unitValue,
          carbonEmissions: importData.carbonEmissions,
          carbonCertificates: importData.carbonCertificates || 0,
          notes: importData.notes || ''
        })
      } else {
        setError(importResult.error || 'Importation non trouvée')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!declaration || !importItem) return

    try {
      setSaveLoading(true)

      const response = await fetch(`/api/declarations/${declarationId}/imports/${importId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Importation mise à jour avec succès'
        })
        router.push(`/dashboard/declarations/${declarationId}`)
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de la mise à jour',
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
      setSaveLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!declaration || !importItem) return

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette importation ?')) {
      return
    }

    try {
      setDeleteLoading(true)

      const response = await fetch(`/api/declarations/${declarationId}/imports/${importId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Importation supprimée avec succès'
        })
        router.push(`/dashboard/declarations/${declarationId}`)
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
      setDeleteLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <EditImportSkeleton />
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href={`/dashboard/declarations/${declarationId}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la déclaration
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!declaration || !importItem) {
    return null
  }

  const totalValue = watchedQuantity * watchedUnitValue

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href={`/dashboard/declarations/${declarationId}`} 
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la déclaration
        </Link>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleDelete}
          disabled={deleteLoading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {deleteLoading ? 'Suppression...' : 'Supprimer'}
        </Button>
      </div>

      {/* En-tête */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Modifier l'importation
        </h1>
        <p className="text-muted-foreground">
          Modification de l'importation dans la déclaration T{declaration.reportingPeriod.quarter} {declaration.reportingPeriod.year}
        </p>
      </div>

      {/* Informations sur le produit (non modifiable) */}
      <Card>
        <CardHeader>
          <CardTitle>Produit importé</CardTitle>
          <CardDescription>
            Informations sur le produit (non modifiables)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Nom du produit</p>
              <p className="font-medium">{importItem.product?.name || 'Non disponible'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Code NC</p>
              <p className="font-medium">{importItem.product?.cnCode || 'Non disponible'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Secteur</p>
              <Badge variant="outline">{getSectorLabel(importItem.product?.sector || '')}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Intensité carbone</p>
              <p className="font-medium">{importItem.product?.carbonIntensity || 0} tCO₂e/tonne</p>
            </div>
          </div>
          
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Pour modifier le produit, vous devez supprimer cette importation et en créer une nouvelle.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations fournisseur */}
          <Card>
            <CardHeader>
              <CardTitle>Fournisseur</CardTitle>
              <CardDescription>
                Informations sur le fournisseur de cette importation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du fournisseur *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: ABC Industries Ltd" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nom complet de l'entreprise fournisseur
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays du fournisseur *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un pays" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Pays d'origine du fournisseur (pays de production)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Quantités et valeurs */}
          <Card>
            <CardHeader>
              <CardTitle>Quantités et valeurs</CardTitle>
              <CardDescription>
                Informations sur les quantités importées et leur valeur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité (tonnes) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.001" 
                          min="0" 
                          placeholder="0.000"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Quantité totale importée en tonnes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valeur unitaire (€/tonne) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Prix par tonne en euros
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {totalValue > 0 && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">Calcul automatique</span>
                  </div>
                  <div className="text-sm">
                    <p><strong>Valeur totale :</strong> {formatCurrency(totalValue)}</p>
                    <p className="text-muted-foreground">
                      {watchedQuantity} tonnes × {formatCurrency(watchedUnitValue)}/tonne
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Émissions carbone */}
          <Card>
            <CardHeader>
              <CardTitle>Émissions carbone</CardTitle>
              <CardDescription>
                Émissions de CO₂ associées à cette importation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="carbonEmissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Émissions carbone (tCO₂e) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Émissions de CO₂ équivalent en tonnes. 
                      {importItem.product?.carbonIntensity && (
                        <span> Estimation : {(watchedQuantity * importItem.product.carbonIntensity).toFixed(2)} tCO₂e</span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carbonCertificates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificats CBAM détenus (optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="1" 
                        min="0" 
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Nombre de certificats CBAM que vous possédez pour couvrir ces émissions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('carbonEmissions') > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Résumé carbone</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Émissions totales :</span>
                      <span>{formatCO2(form.watch('carbonEmissions'), 't')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificats requis :</span>
                      <span>{Math.ceil(form.watch('carbonEmissions'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificats détenus :</span>
                      <span>{form.watch('carbonCertificates') || 0}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">Déficit :</span>
                      <span className={
                        Math.max(0, Math.ceil(form.watch('carbonEmissions')) - (form.watch('carbonCertificates') || 0)) > 0
                          ? 'text-red-600 font-medium'
                          : 'text-green-600 font-medium'
                      }>
                        {Math.max(0, Math.ceil(form.watch('carbonEmissions')) - (form.watch('carbonCertificates') || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes et commentaires</CardTitle>
              <CardDescription>
                Informations complémentaires sur cette importation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ajoutez des notes ou commentaires sur cette importation..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Notes internes sur cette importation (maximum 1000 caractères)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Historique de modification */}
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
              <CardDescription>
                Informations sur les modifications de cette importation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Créée le</p>
                  <p className="font-medium">{formatDate(importItem.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modifiée le</p>
                  <p className="font-medium">{formatDate(importItem.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <ImportStatusBadge status={importItem.status} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documents</p>
                  <p className="font-medium">{importItem.documents?.length || 0} document(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button type="submit" disabled={saveLoading} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {saveLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
                <Link href={`/dashboard/declarations/${declarationId}`}>
                  <Button variant="outline" type="button">
                    Annuler
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Aide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Aide et conseils
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Modification d'une importation</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Le produit ne peut pas être modifié après création</li>
                <li>• La valeur totale est calculée automatiquement</li>
                <li>• Les émissions peuvent être ajustées selon les certificats du fournisseur</li>
                <li>• Les modifications mettent à jour automatiquement le résumé de la déclaration</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Suppression</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• La suppression est définitive et ne peut pas être annulée</li>
                <li>• Le résumé de la déclaration sera automatiquement mis à jour</li>
                <li>• Les documents associés seront également supprimés</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getSectorLabel(sector: string): string {
  const labels: Record<string, string> = {
    cement: 'Ciment',
    iron_steel: 'Fer et acier',
    aluminum: 'Aluminium',
    fertilizers: 'Engrais',
    electricity: 'Électricité',
    hydrogen: 'Hydrogène'
  }
  return labels[sector] || sector
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

function EditImportSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}