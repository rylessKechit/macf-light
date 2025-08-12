'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Leaf, AlertCircle, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Schéma de validation
const signInSchema = z.object({
  email: z.string().email('Email invalide').trim().toLowerCase(),
  password: z.string().min(1, 'Le mot de passe est requis')
})

type FormData = z.infer<typeof signInSchema>

export default function SignInPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange'
  })

  // Redirection si déjà connecté
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push(callbackUrl)
      }
    }
    checkSession()
  }, [router, callbackUrl])

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Tentative de connexion pour:', data.email)

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      })

      if (result?.error) {
        console.log('❌ Erreur de connexion:', result.error)
        setError('Email ou mot de passe incorrect')
      } else if (result?.ok) {
        console.log('✅ Connexion réussie, redirection vers:', callbackUrl)
        router.push(callbackUrl)
      } else {
        setError('Une erreur inattendue est survenue')
      }
    } catch (err) {
      console.error('❌ Erreur lors de la connexion:', err)
      setError('Une erreur est survenue lors de la connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* En-tête avec logo */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold hover:opacity-80 transition-opacity">
            <Leaf className="h-8 w-8 text-primary" />
            MACF Light
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Connexion</h1>
            <p className="text-muted-foreground">
              Connectez-vous à votre compte pour accéder au tableau de bord
            </p>
          </div>
        </div>

        {/* Alerte d'erreur */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Formulaire de connexion */}
        <Card>
          <CardHeader>
            <CardTitle>Se connecter</CardTitle>
            <CardDescription>
              Entrez vos identifiants pour accéder à votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@entreprise.com"
                  disabled={loading}
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  disabled={loading}
                  {...register('password')}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !isValid}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Pas encore de compte ?{' '}
                <Link href="/auth/signup" className="text-primary hover:underline">
                  Créer un compte
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            En vous connectant, vous acceptez nos{' '}
            <Link href="/legal/terms" className="hover:underline">
              conditions d'utilisation
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}