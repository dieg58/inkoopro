'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Sidebar } from '@/components/Sidebar'
import { Loader2 } from 'lucide-react'

interface ClientLayoutProps {
  children: React.ReactNode
}

// Pages qui DOIVENT avoir la sidebar (interface de devis uniquement)
const SIDEBAR_PAGES = [
  '/quote',
  '/quotes',
  '/orders',
  '/invoices',
  '/settings',
]

// Pages publiques qui ne nécessitent pas d'authentification
const PUBLIC_PAGES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

export function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    // Vérifier si la page actuelle doit avoir la sidebar
    // La sidebar est uniquement visible dans l'interface de devis, pas sur le frontend public
    const shouldShowSidebar = SIDEBAR_PAGES.some(path => 
      pathname.includes(path)
    )
    setShowSidebar(shouldShowSidebar)

    if (shouldShowSidebar) {
      // Charger les informations du client
      const loadClient = async () => {
        try {
          const response = await fetch('/api/auth/me')
          const data = await response.json()
          
          if (data.success && data.client) {
            setClient(data.client)
          } else {
            // Si l'utilisateur n'est pas authentifié et qu'on est sur une page qui nécessite la sidebar
            // (interface de devis), rediriger vers login
            if (shouldShowSidebar) {
              router.push(`/${locale}/login`)
            }
          }
        } catch (error) {
          console.error('Erreur chargement client:', error)
        } finally {
          setLoading(false)
        }
      }
      
      loadClient()
    } else {
      setLoading(false)
    }
  }, [pathname, router, locale])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push(`/${locale}`)
      router.refresh()
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    }
  }

  // Si on charge et qu'on doit afficher la sidebar, montrer un loader
  if (loading && showSidebar) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar client={client} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  // Si on doit afficher la sidebar, envelopper le contenu
  if (showSidebar) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar client={client} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    )
  }

  // Sinon, afficher le contenu sans sidebar
  return <>{children}</>
}

