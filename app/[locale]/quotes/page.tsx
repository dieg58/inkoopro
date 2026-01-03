'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, FileText, Edit, Plus } from 'lucide-react'
import { LanguageSelector } from '@/components/LanguageSelector'

interface SavedQuote {
  id: string
  title: string
  status: string
  step: string
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  odooOrderId: number | null
}

export default function QuotesPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations()
  const { toast } = useToast()
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)

  const loadData = useCallback(async () => {
    try {
      // Vérifier l'authentification
      const clientResponse = await fetch('/api/auth/me')
      const clientData = await clientResponse.json()
      
      if (!clientData.success || !clientData.client) {
        router.push(`/${locale}/login`)
        return
      }

      setClient(clientData.client)

      // Charger les devis sauvegardés
      const quotesResponse = await fetch('/api/quotes/list')
      const quotesData = await quotesResponse.json()

      if (quotesData.success) {
        const quotes = quotesData.quotes || []
        console.log('📋 Devis sauvegardés chargés:', quotes.length)
        setSavedQuotes(quotes)
      } else {
        console.warn('⚠️ Erreur chargement devis sauvegardés:', quotesData.error)
        toast({
          title: t('common.error'),
          description: quotesData.error || 'Erreur lors du chargement des devis',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erreur chargement devis:', error)
      toast({
        title: t('common.error'),
        description: 'Erreur lors du chargement des devis',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast, t, locale])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Mes devis</h1>
            <p className="text-muted-foreground">Gérez vos devis en cours et sauvegardés</p>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <Button onClick={() => router.push(`/${locale}/quote`)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau devis
            </Button>
            <Button variant="outline" onClick={loadData}>
              <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Quotes List */}
        {savedQuotes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Aucun devis sauvegardé</p>
              <p className="text-sm text-muted-foreground mt-2">
                Créez votre premier devis pour commencer
              </p>
              <Button onClick={() => router.push(`/${locale}/quote`)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer un devis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {savedQuotes.map((quote) => (
              <Card key={quote.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {quote.title || 'Devis sans titre'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Créé le {formatDate(quote.createdAt)}
                        {quote.updatedAt !== quote.createdAt && (
                          <span> • Modifié le {formatDate(quote.updatedAt)}</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={quote.status === 'draft' ? 'default' : 'secondary'}>
                        {quote.status === 'draft' ? 'Brouillon' : quote.status}
                      </Badge>
                      {quote.odooOrderId && (
                        <Badge variant="outline">
                          Commande #{quote.odooOrderId}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Étape actuelle: <strong className="text-foreground">{quote.step}</strong>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/quotes/${quote.id}`)
                            
                            if (response.status === 401) {
                              toast({
                                title: t('common.error'),
                                description: 'Votre session a expiré. Veuillez vous reconnecter.',
                                variant: 'destructive',
                              })
                              router.push(`/${locale}/login`)
                              return
                            }
                            
                            const data = await response.json()
                            if (data.success && data.quote) {
                              const quoteId = data.quote.id
                              console.log(`📋 Chargement du devis avec ID: ${quoteId}`)
                              localStorage.setItem('inkoo_pro_quote_to_load', JSON.stringify({
                                quoteId: quoteId,
                                quote: data.quote,
                              }))
                              router.push(`/${locale}/quote`)
                            } else {
                              toast({
                                title: t('common.error'),
                                description: data.error || 'Erreur lors du chargement du devis',
                                variant: 'destructive',
                              })
                            }
                          } catch (error) {
                            console.error('Erreur chargement devis:', error)
                            toast({
                              title: t('common.error'),
                              description: 'Erreur lors du chargement du devis',
                              variant: 'destructive',
                            })
                          }
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

