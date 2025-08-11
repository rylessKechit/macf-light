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
  AlertTriangle,
  Info,
  Calculator
} from 'lucide-react'
import { formatCurrency, formatCO2 } from '@/lib/utils'
import { CbamDeclaration, CbamProduct, ImportForm } from '@/types/cbam'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  productId: z.string().min(1, 'Le produit est requis'),
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

export default function NewImportPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  const [declaration, setDeclaration] = useState<CbamDeclaration | null>(null)
  const [products, setProducts] = useState<CbamProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)

  const declarationId = params.id as string

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: '',
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
  const watchedProductId = form.watch('productId')
  const selectedProduct = products.find(p => p.id === watchedProductId)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session?.user?.id && declarationId) {
      fetchData()
    }
  }, [session, declarationId])

  // Auto-calcul des émissions carbone
  useEffect(() => {
    if (selectedProduct && watchedQuantity > 0) {
      const estimatedEmissions = watchedQuantity * selectedProduct.carbonIntensity
      form.setValue('carbonEmissions', Math.round(estimatedEmissions * 100) / 100)
    }
  }, [selectedProduct, watchedQuantity, form])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Récupérer la déclaration
      const [declarationResponse, productsResponse] = await Promise.all([
        fetch(`/api/declarations/${declarationId}`),
        fetch('/api/products?limit=1000&activeOnly=true')
      ])

      const declarationResult = await declarationResponse.json()
      const productsResult = await productsResponse.json()

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

      if (productsResult.success) {
        setProducts(productsResult.data.data)
      } else {
        setError('Erreur lors du chargement des produits')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!declaration) return

    try {
      setSaveLoading(true)

      const response = await fetch(`/api/declarations/${declarationId}/imports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Importation ajoutée avec succès'
        })
        router.push(`/dashboard/declarations/${declarationId}`)
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de la création',
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

  if (status === 'loading' || loading) {
    return <NewImportSkeleton />
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

  if (!declaration) {
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
      </div>

      {/* En-tête */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Nouvelle importation
        </h1>
        <p className="text-muted-foreground">
          Ajouter une importation à la déclaration T{declaration.reportingPeriod.quarter} {declaration.reportingPeriod.year}
        </p>
      </div>

      {/* Informations sur la déclaration */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Cette importation sera ajoutée à votre déclaration pour la période T{declaration.reportingPeriod.quarter} {declaration.reportingPeriod.year}.
          Assurez-vous que la date d'importation correspond bien à cette période.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Sélection du produit */}
          <Card>
            <CardHeader>
              <CardTitle>Produit importé</CardTitle>
              <CardDescription>
                Sélectionnez le produit CBAM concerné par cette importation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produit CBAM *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un produit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (CN {product.cnCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choisissez le produit dans la liste des produits couverts par le CBAM
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedProduct && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Informations sur le produit</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Code NC :</span>
                      <span>{selectedProduct.cnCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Secteur :</span>
                      <span>{getSectorLabel(selectedProduct.sector)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Intensité carbone :</span>
                      <span>{selectedProduct.carbonIntensity} tCO₂e/tonne</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                      {selectedProduct 
                        ? `Valeur calculée automatiquement (${selectedProduct.carbonIntensity} tCO₂e/tonne × quantité)`
                        : 'Émissions de CO₂ équivalent en tonnes'
                      }
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
                Informations complémentaires sur cette importation (optionnel)
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

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button type="submit" disabled={saveLoading} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {saveLoading ? 'Enregistrement...' : 'Enregistrer l\'importation'}
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
              <h4 className="font-medium mb-2">Remplissage du formulaire</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Le produit doit être sélectionné dans la liste officielle CBAM</li>
                <li>• La quantité doit être exprimée en tonnes</li>
                <li>• Les émissions sont calculées automatiquement selon l'intensité carbone du produit</li>
                <li>• Les certificats CBAM sont optionnels mais recommandés pour le suivi</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Calculs automatiques</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Valeur totale = Quantité × Valeur unitaire</li>
                <li>• Émissions = Quantité × Intensité carbone du produit</li>
                <li>• 1 certificat CBAM = 1 tonne de CO₂ équivalent</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Documents requis</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Facture commerciale</li>
                <li>• Certificat d'émissions du fournisseur</li>
                <li>• Documents douaniers (selon le cas)</li>
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

function NewImportSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <Skeleton className="h-16 w-full" />

      {Array.from({ length: 5 }).map((_, i) => (
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