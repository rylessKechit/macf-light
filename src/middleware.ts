import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Pages qui nécessitent une authentification
    const protectedPaths = ['/dashboard', '/declarations', '/suppliers', '/settings']
    
    // Pages d'administration
    const adminPaths = ['/admin']
    
    // Pages d'authentification
    const authPaths = ['/auth/signin', '/auth/signup', '/auth/reset-password']
    
    // API routes qui nécessitent une authentification
    const protectedApiPaths = ['/api/declarations', '/api/suppliers', '/api/user']
    
    // Vérifier les différents types de routes
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path))
    const isAuthPath = authPaths.some(path => pathname.startsWith(path))
    const isProtectedApiPath = protectedApiPaths.some(path => pathname.startsWith(path))
    
    // Gestion des API routes protégées
    if (isProtectedApiPath && !token) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
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
    
    // Rediriger les utilisateurs authentifiés depuis les pages d'auth
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
        const publicPaths = ['/', '/legal', '/auth', '/api/auth']
        if (publicPaths.some(path => pathname.startsWith(path))) {
          return true
        }
        
        // Pages d'API publiques
        const publicApiPaths = ['/api/auth/signup', '/api/health']
        if (publicApiPaths.some(path => pathname.startsWith(path))) {
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}