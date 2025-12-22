import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['fr', 'en', 'nl'] as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  // If locale is undefined or not in the list, use default locale
  if (!locale || !locales.includes(locale as Locale)) {
    // Use default locale instead of calling notFound() to avoid breaking the app
    const validLocale = 'fr' as Locale
    return {
      locale: validLocale,
      messages: (await import(`./messages/${validLocale}.json`)).default
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})

