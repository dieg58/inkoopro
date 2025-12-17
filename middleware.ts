import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Routes publiques (pas de protection)
  const publicRoutes = ['/login', '/admin/login', '/api/auth/login', '/api/auth/logout', '/api/auth/me', '/api/service-pricing', '/api/pricing-config']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Vérifier si c'est une route admin (sauf /admin/login qui est déjà dans publicRoutes)
  if (pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('admin-auth')
    
    // Si pas de cookie d'authentification, rediriger vers login
    if (!authCookie || authCookie.value !== 'true') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Vérifier l'authentification client pour les autres routes (sauf admin)
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    const clientCookie = request.cookies.get('odoo_client')
    
    // Si pas de cookie client, rediriger vers login
    if (!clientCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

