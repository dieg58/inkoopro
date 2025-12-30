import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { locales } from './i18n'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'fr',
  localePrefix: 'always'
})

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Les routes API ne doivent pas passer par next-intl
  if (pathname.startsWith('/api/')) {
    // Routes publiques API (pas de protection)
    const publicApiRoutes = [
      '/api/auth/login', 
      '/api/auth/logout', 
      '/api/auth/me', 
      '/api/service-pricing', 
      '/api/pricing-config',
      '/api/admin/login', // Route de connexion admin doit être publique
      '/api/contact' // Formulaire de contact (public)
    ]
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // Vérifier si c'est une route admin API (sauf login qui est déjà publique)
    if (pathname.startsWith('/api/admin')) {
      const authCookie = request.cookies.get('admin-auth')
      if (!authCookie || authCookie.value !== 'true') {
        return NextResponse.redirect(new URL('/fr/admin/login', request.url))
      }
    }

    return NextResponse.next()
  }

  // Laisser next-intl traiter la route d'abord pour extraire la locale
  const response = intlMiddleware(request)
  
  // Préserver les cookies existants dans la réponse
  const clientCookie = request.cookies.get('odoo_client')
  const adminCookie = request.cookies.get('admin-auth')
  
  // Extraire la locale du pathname après traitement par next-intl
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  // Si le pathname commence par une locale, l'enlever pour les vérifications
  let pathnameWithoutLocale = pathname
  let detectedLocale = 'fr'
  if (pathnameHasLocale) {
    const locale = locales.find((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)
    if (locale) {
      detectedLocale = locale
      pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/'
    }
  }

  // Routes publiques (pas de protection) - retourner la réponse de next-intl
  const publicRoutes = ['/login', '/register', '/admin/login']
  // La page d'accueil (/) est publique
  if (pathnameWithoutLocale === '/' || publicRoutes.some(route => pathnameWithoutLocale.startsWith(route))) {
    return response
  }

  // Vérifier si c'est une route admin (sauf /admin/login qui est déjà dans publicRoutes)
  if (pathnameWithoutLocale.startsWith('/admin')) {
    // Si pas de cookie d'authentification, rediriger vers login
    if (!adminCookie || adminCookie.value !== 'true') {
      const redirectResponse = NextResponse.redirect(new URL(`/${detectedLocale}/admin/login`, request.url))
      // Préserver les cookies existants
      if (clientCookie) {
        redirectResponse.cookies.set('odoo_client', clientCookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
      }
      return redirectResponse
    }
  }

  // Vérifier l'authentification client pour les autres routes (sauf admin)
  if (!pathnameWithoutLocale.startsWith('/admin') && !pathnameWithoutLocale.startsWith('/api/admin')) {
    // Si pas de cookie client, rediriger vers login
    if (!clientCookie || !clientCookie.value) {
      console.log('🔒 Middleware: Cookie client manquant, redirection vers login', {
        pathname: pathnameWithoutLocale,
        hasCookie: !!clientCookie,
        cookieValue: clientCookie?.value ? 'present' : 'missing',
        allCookies: Array.from(request.cookies.getAll().map(c => c.name)),
      })
      const redirectResponse = NextResponse.redirect(new URL(`/${detectedLocale}/login`, request.url))
      // Préserver le cookie admin si présent
      if (adminCookie) {
        redirectResponse.cookies.set('admin-auth', adminCookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
          path: '/',
        })
      }
      return redirectResponse
    }
    
    // Vérifier que le cookie contient des données valides
    try {
      const clientData = JSON.parse(clientCookie.value)
      if (!clientData || !clientData.email) {
        console.log('🔒 Middleware: Cookie client invalide, redirection vers login')
        const redirectResponse = NextResponse.redirect(new URL(`/${detectedLocale}/login`, request.url))
        // Préserver le cookie admin si présent
        if (adminCookie) {
          redirectResponse.cookies.set('admin-auth', adminCookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
          })
        }
        return redirectResponse
      }
    } catch (error) {
      console.log('🔒 Middleware: Erreur parsing cookie client, redirection vers login', error)
      const redirectResponse = NextResponse.redirect(new URL(`/${detectedLocale}/login`, request.url))
      // Préserver le cookie admin si présent
      if (adminCookie) {
        redirectResponse.cookies.set('admin-auth', adminCookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
          path: '/',
        })
      }
      return redirectResponse
    }
  }

  // Préserver les cookies dans la réponse finale
  if (clientCookie) {
    response.cookies.set('odoo_client', clientCookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
  }
  if (adminCookie) {
    response.cookies.set('admin-auth', adminCookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })
  }

  // Retourner la réponse de next-intl
  return response
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

