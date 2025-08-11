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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
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
  CheckCircle,
  Info
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CbamDeclaration } from '@/types/cbam'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  notes: z.string().max(2000, 'Les notes ne peuvent pas dépasser 2000 caractères').optional()
})

type FormData = z.infer<typeof formSchema>

export default function EditDeclarationPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  const [declaration, setDeclaration] = useState<CbamDeclaration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)

  const declarationId = params.id as string

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: ''
    }
  })

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
        const declarationData = result.data
        setDeclaration(declarationData)
        
        // Pré-remplir le formulaire
        form.reset({
          notes: declarationData.notes || ''
        })
      } else {
        setError(result.error || 'Déclaration non trouvée')
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

      const response = await fetch(`/api/declarations/${declarationId}`, {
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
          description: 'Déclaration mise à jour avec succès'
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

  if (status === 'loading' || loading) {
    return <EditDeclarationSkeleton />
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

  const canEdit = declaration.status === 'draft' || declaration.status === 'rejected'

  if (!canEdit) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Cette déclaration ne peut pas être modifiée car elle a été soumise ou validée.
          </AlertDescription>
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

  return (
    <div className="container mx-auto py-8 space-y-6">
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
          Modifier la déclaration T{declaration.reportingPeriod.quarter} {declaration.reportingPeriod.year}
        </h1>
        <p className="text-muted-foreground">
          Modifiez les informations de votre déclaration CBAM
        </p>
      </div>

      {/* Informations sur la déclaration */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>
                Période : T{declaration.reportingPeriod.quarter} {declaration.reportingPeriod.year}
              </CardDescription>
            </div>
            <StatusBadge status={declaration.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Créée le</p>
              <p className="font-medium">{formatDate(declaration.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Échéance</p>
              <p className="font-medium">{formatDate(declaration.deadlineDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Importations</p>
              <p className="font-medium">{declaration.summary.totalImports}</p>
            </div>
          </div>

          {declaration.rejectionReason && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Motif de rejet :</strong> {declaration.rejectionReason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Formulaire d'édition */}
      <Card>
        <CardHeader>
          <CardTitle>Informations modifiables</CardTitle>
          <CardDescription>
            Seules les notes peuvent être modifiées pour cette déclaration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes et commentaires</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ajoutez des notes ou commentaires sur cette déclaration..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Notes internes sur cette déclaration (maximum 2000 caractères)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saveLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
                <Link href={`/dashboard/declarations/${declarationId}`}>
                  <Button variant="outline" type="button">
                    Annuler
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Actions supplémentaires */}
      <Card>
        <CardHeader>
          <CardTitle>Actions disponibles</CardTitle>
          <CardDescription>
            Autres actions que vous pouvez effectuer sur cette déclaration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Gérer les importations</h4>
                <p className="text-sm text-muted-foreground">
                  Ajouter, modifier ou supprimer des importations
                </p>
              </div>
              <Link href={`/dashboard/declarations/${declarationId}/imports`}>
                <Button variant="outline">Gérer</Button>
              </Link>
            </div>

            {declaration.status === 'draft' && declaration.summary.totalImports > 0 && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Soumettre la déclaration</h4>
                  <p className="text-sm text-muted-foreground">
                    Soumettre cette déclaration pour validation
                  </p>
                </div>
                <Link href={`/dashboard/declarations/${declarationId}`}>
                  <Button>Soumettre</Button>
                </Link>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Supprimer la déclaration</h4>
                <p className="text-sm text-muted-foreground">
                  Supprimer définitivement cette déclaration
                </p>
              </div>
              <Button variant="destructive" onClick={() => {
                if (confirm('Êtes-vous sûr de vouloir supprimer cette déclaration ?')) {
                  // Logique de suppression ici
                  router.push('/dashboard/declarations')
                }
              }}>
                Supprimer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations d'aide */}
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
              <h4 className="font-medium mb-2">Modification des déclarations</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Seules les déclarations en brouillon ou rejetées peuvent être modifiées</li>
                <li>• Les notes peuvent être ajoutées ou modifiées à tout moment</li>
                <li>• Pour modifier les importations, utilisez la section dédiée</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Soumission</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Au moins une importation est requise pour soumettre</li>
                <li>• Une fois soumise, la déclaration ne peut plus être modifiée</li>
                <li>• Vérifiez toutes les informations avant de soumettre</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    draft: { variant: 'outline' as const, icon: 'Brouillon' },
    submitted: { variant: 'default' as const, icon: 'Soumise' },
    validated: { variant: 'secondary' as const, icon: 'Validée' },
    rejected: { variant: 'destructive' as const, icon: 'Rejetée' },
    pending: { variant: 'default' as const, icon: 'En attente' }
  }

  const config = variants[status as keyof typeof variants] || variants.draft

  return (
    <Badge variant={config.variant}>
      {config.icon}
    </Badge>
  )
}

function EditDeclarationSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-3 w-48 mt-2" />
            </div>
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}