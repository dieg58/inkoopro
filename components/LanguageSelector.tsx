'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
]

const STORAGE_KEY = 'inkoo_pro_preferred_language'
const COOKIE_NAME = 'NEXT_LOCALE'

export function LanguageSelector() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [currentLocale, setCurrentLocale] = useState(locale)
  const [mounted, setMounted] = useState(false)

  // Marquer comme monté pour éviter les problèmes d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  // Synchroniser avec la locale actuelle depuis l'URL
  useEffect(() => {
    if (mounted) {
      // Extraire la locale depuis le pathname pour être sûr
      const pathSegments = pathname.split('/').filter(Boolean)
      const pathLocale = pathSegments[0] && ['fr', 'en', 'nl'].includes(pathSegments[0]) 
        ? pathSegments[0] 
        : locale
      setCurrentLocale(pathLocale)
    }
  }, [locale, pathname, mounted])

  // Charger la langue préférée depuis localStorage au montage
  useEffect(() => {
    if (!mounted) return

    const savedLocale = localStorage.getItem(STORAGE_KEY)
    if (savedLocale && ['fr', 'en', 'nl'].includes(savedLocale) && savedLocale !== locale) {
      // Si la langue sauvegardée est différente de la locale actuelle, rediriger
      const segments = pathname.split('/').filter(Boolean)
      if (segments[0] && ['fr', 'en', 'nl'].includes(segments[0])) {
        segments[0] = savedLocale
      } else {
        segments.unshift(savedLocale)
      }
      const newPath = '/' + segments.join('/')
      router.push(newPath)
    }
  }, [mounted]) // Seulement au montage

  const setCookie = (name: string, value: string, days: number = 365) => {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
  }

  const handleLanguageChange = (newLocale: string) => {
    // Sauvegarder la préférence dans localStorage
    localStorage.setItem(STORAGE_KEY, newLocale)
    
    // Sauvegarder aussi dans un cookie pour que le serveur puisse le lire
    setCookie(COOKIE_NAME, newLocale)
    
    // Mettre à jour l'état local immédiatement pour l'affichage
    setCurrentLocale(newLocale)
    
    // Remplacer la locale dans le pathname
    const segments = pathname.split('/').filter(Boolean)
    if (segments[0] && ['fr', 'en', 'nl'].includes(segments[0])) {
      segments[0] = newLocale
    } else {
      segments.unshift(newLocale)
    }
    const newPath = '/' + segments.join('/')
    
    // Utiliser window.location pour forcer un rechargement complet avec les nouvelles traductions
    window.location.href = newPath
  }

  // Ne pas rendre le sélecteur jusqu'à ce que le composant soit monté
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <div className="w-[140px] h-10 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  // Utiliser la locale depuis le pathname ou currentLocale comme fallback
  const pathSegments = pathname.split('/').filter(Boolean)
  const pathLocale = pathSegments[0] && ['fr', 'en', 'nl'].includes(pathSegments[0]) 
    ? pathSegments[0] 
    : (currentLocale || locale)
  const displayLocale = pathLocale

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={displayLocale} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue>
            {languages.find(lang => lang.code === displayLocale)?.label || 'Français'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

