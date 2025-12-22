'use client'

import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { LanguageSelector } from '@/components/LanguageSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Package, Palette, Truck, Shield, Zap, Users, ArrowRight, LogIn, UserPlus } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('landing')
  const commonT = useTranslations('common')
  const authT = useTranslations('auth')

  const features = [
    {
      icon: Package,
      title: t('features.products.title'),
      description: t('features.products.description'),
    },
    {
      icon: Palette,
      title: t('features.customization.title'),
      description: t('features.customization.description'),
    },
    {
      icon: Truck,
      title: t('features.delivery.title'),
      description: t('features.delivery.description'),
    },
    {
      icon: Shield,
      title: t('features.secure.title'),
      description: t('features.secure.description'),
    },
    {
      icon: Zap,
      title: t('features.fast.title'),
      description: t('features.fast.description'),
    },
    {
      icon: Users,
      title: t('features.support.title'),
      description: t('features.support.description'),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">INKOO PRO</h1>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <Button variant="ghost" onClick={() => router.push(`/${locale}/login`)}>
              <LogIn className="h-4 w-4 mr-2" />
              {authT('login')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {t('hero.title')}
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('hero.description')}
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => router.push(`/${locale}/login`)}>
            <LogIn className="h-5 w-5 mr-2" />
            {authT('login')}
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            asChild
          >
            <Link href={`/${locale}/register`} className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              {t('hero.register')}
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">{t('features.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="text-xl font-semibold">{feature.title}</h4>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-12 pb-12 text-center">
            <h3 className="text-3xl font-bold mb-4">{t('cta.title')}</h3>
            <p className="text-lg mb-8 opacity-90">{t('cta.description')}</p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => router.push(`/${locale}/login`)}
            >
              {t('cta.button')}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>{t('footer.text')}</p>
        </div>
      </footer>
    </div>
  )
}
