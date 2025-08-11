'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Calendar, Info } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

const formSchema = z.object({
  quarter: z.coerce.number().min(1).max(4),
  year: z.coerce.number().min(2023).max(new Date().getFullYear() + 1)
})

type FormData = z.infer<typeof formSchema>

export default function NewDeclarationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quarter: getCurrentQuarter(),
      year: new Date().getFullYear()
    }
  })

  const selectedQuarter = form.watch('quarter')
  const selectedYear = form.watch('year')

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/declarations', {
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
          description: 'Déclaration créée avec succès'
        })
        router.push(`/dashboard/declarations/${result.data.id}`)
      } else {
        setError(result.error || 'Erreur lors de la création')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  // Calculer la date limite pour la période sélectionnée
  const getDeadlineDate = (quarter: number, year: number): Date => {
    const deadlines = [
      new Date(year, 4, 31), // 31 mai (mois 4 = mai car indexé à 0)
      new Date(year, 7, 31), // 31 août
      new Date(year, 10, 30), // 30 novembre
      new Date(year + 1, 1, 28) // 28 février année suivante
    ]
    return deadlines[quarter - 1]
  }

  const deadlineDate = getDeadlineDate(selectedQuarter, selectedYear)

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/dashboard/declarations" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux déclarations
        </Link>
      </div>

      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nouvelle déclaration CBAM</h1>
        <p className="text-muted-foreground">
          Créez une nouvelle déclaration trimestrielle pour vos importations
        </p>
      </div>

      {/* Alerte informative */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Information importante :</strong> Une déclaration CBAM doit être soumise pour chaque trimestre 
          où vous avez effectué des importations de produits couverts par le règlement CBAM.
        </AlertDescription>
      </Alert>

      {/* Erreur */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle>Période de déclaration</CardTitle>
          <CardDescription>
            Sélectionnez la période pour laquelle vous souhaitez créer une déclaration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Sélection de l'année */}
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Année</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une année" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => {
                            const year = new Date().getFullYear() - i + 1
                            return (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Année de la période de déclaration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sélection du trimestre */}
                <FormField
                  control={form.control}
                  name="quarter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trimestre</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un trimestre" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">T1 (Janvier - Mars)</SelectItem>
                          <SelectItem value="2">T2 (Avril - Juin)</SelectItem>
                          <SelectItem value="3">T3 (Juillet - Septembre)</SelectItem>
                          <SelectItem value="4">T4 (Octobre - Décembre)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Trimestre de la période de déclaration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Informations sur la période sélectionnée */}
              {selectedQuarter && selectedYear && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          Période sélectionnée : T{selectedQuarter} {selectedYear}
                        </span>
                      </div>
                      
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Période couverte :</span>
                          <span>{getPeriodLabel(selectedQuarter, selectedYear)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date limite de soumission :</span>
                          <span className="font-medium text-orange-600">
                            {formatDate(deadlineDate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Temps restant :</span>
                          <span>
                            {getTimeRemaining(deadlineDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Création en cours...' : 'Créer la déclaration'}
                </Button>
                <Link href="/dashboard/declarations">
                  <Button variant="outline" type="button">
                    Annuler
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Informations supplémentaires */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Prochaines étapes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Ajouter vos importations</p>
                <p className="text-muted-foreground">
                  Saisissez toutes les importations de produits CBAM effectuées pendant cette période
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Joindre les documents</p>
                <p className="text-muted-foreground">
                  Ajoutez les factures, certificats d'émissions et autres documents requis
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Vérifier et soumettre</p>
                <p className="text-muted-foreground">
                  Vérifiez toutes les informations avant de soumettre votre déclaration
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getCurrentQuarter(): number {
  const month = new Date().getMonth() + 1 // getMonth() retourne 0-11
  return Math.ceil(month / 3)
}

function getPeriodLabel(quarter: number, year: number): string {
  const periods = [
    'Janvier - Mars',
    'Avril - Juin', 
    'Juillet - Septembre',
    'Octobre - Décembre'
  ]
  return `${periods[quarter - 1]} ${year}`
}

function getTimeRemaining(deadline: Date): string {
  const now = new Date()
  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return `En retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`
  } else if (diffDays === 0) {
    return 'Échéance aujourd\'hui'
  } else if (diffDays === 1) {
    return 'Échéance demain'
  } else if (diffDays <= 7) {
    return `${diffDays} jours restants`
  } else if (diffDays <= 30) {
    return `${diffDays} jours restants`
  } else {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} semaine${weeks > 1 ? 's' : ''} restante${weeks > 1 ? 's' : ''}`
  }
}