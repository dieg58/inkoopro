import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n'
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ContactButton } from "@/components/ContactForm"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "INKOO PRO - Devis en ligne",
  description: "Créez votre devis personnalisé pour impression et broderie textile",
}

// Désactiver le prerendering car les pages utilisent des cookies et des données dynamiques
export const dynamic = 'force-dynamic'

// Ne pas générer de paramètres statiques pour éviter le prerendering
// export function generateStaticParams() {
//   return locales.map((locale) => ({ locale }))
// }

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound()
  }

  // Enable static rendering and set the locale for this request
  setRequestLocale(locale)

  // Providing all messages to the client
  // side is the easiest way to get started
  // Pass locale explicitly to getMessages
  // Gérer les erreurs lors du chargement des messages
  let messages
  try {
    messages = await getMessages({ locale })
    // Vérifier que les messages ne sont pas vides
    if (!messages || Object.keys(messages).length === 0) {
      console.warn(`⚠️ Aucun message trouvé pour la locale: ${locale}`)
      // Essayer de charger les messages en français comme fallback
      try {
        messages = await getMessages({ locale: 'fr' })
      } catch (fallbackError) {
        console.error('Erreur lors du chargement des messages de fallback:', fallbackError)
        messages = {}
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des messages:', error)
    // En cas d'erreur, essayer de charger les messages en français comme fallback
    try {
      messages = await getMessages({ locale: 'fr' })
    } catch (fallbackError) {
      console.error('Erreur lors du chargement des messages de fallback:', fallbackError)
      // En dernier recours, utiliser un objet vide pour éviter les erreurs de rendu
      messages = {}
    }
  }

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster />
        <ContactButton />
      </body>
    </html>
  )
}

