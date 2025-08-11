'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()

  useEffect(() => {
    // Rediriger vers le dashboard si l'utilisateur est déjà connecté
    if (status === 'authenticated' && session) {
      redirect('/dashboard')
    }
  }, [session, status])

  // Afficher un loader pendant la vérification de session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Si l'utilisateur est connecté, on ne rend pas les pages d'auth
  if (status === 'authenticated') {
    return null
  }

  return <>{children}</>
}