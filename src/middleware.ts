import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Pages qui nécessitent une authentification
    const protectedPaths = ['/dashboard']
    
    // Pages d'administration qui nécessitent un rôle admin
    const adminPaths = ['/admin']
    
    // Pages d'authentification (accessibles seulement si non connecté)
    const authPaths = ['/auth/signin', '/auth/signup', '/auth/forgot-password']
    
    // Vérifier si la route nécessite une authentification
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path))
    const isAuthPath = authPaths.some(path => pathname.startsWith(path))
    
    // Rediriger vers la page de connexion si non authentifié
    if (isProtectedPath && !token) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
    
    // Vérifier les permissions admin
    if (isAdminPath && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    // Rediriger les utilisateurs authentifiés depuis les pages d'auth vers le dashboard
    if (token && isAuthPath) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Autoriser l'accès aux pages publiques
        if (pathname === '/' || pathname.startsWith('/auth/') || pathname.startsWith('/legal/')) {
          return true
        }
        
        // Vérifier l'authentification pour les autres pages
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}