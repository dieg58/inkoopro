'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ArrowLeft, Package, Calendar, Euro, FileText, Edit, Trash2, RefreshCw } from 'lucide-react'
import { OdooOrder } from '@/lib/odoo-orders'
import { translateOrderState, getOrderStateColor } from '@/lib/odoo-orders'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

export default function OrdersPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations()
  const { toast } = useToast()
  const [orders, setOrders] = useState<OdooOrder[]>([])
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)

  const loadData = useCallback(async () => {
      try {
        // Vérifier l'authentification
        const clientResponse = await fetch('/api/auth/me')
        const clientData = await clientResponse.json()
        
        if (!clientData.success || !clientData.client) {
          router.push('/login')
          return
        }

        setClient(clientData.client)

        // Charger les commandes Odoo
        const ordersResponse = await fetch('/api/orders')
        const ordersData = await ordersResponse.json()

        if (ordersData.success) {
          setOrders(ordersData.orders || [])
        } else {
          toast({
            title: t('common.error'),
            description: ordersData.error || t('orders.errorLoadingOrders'),
            variant: 'destructive',
          })
        }

        // Charger les devis sauvegardés
        const quotesResponse = await fetch('/api/quotes/list')
        const quotesData = await quotesResponse.json()

        if (quotesData.success) {
          const quotes = quotesData.quotes || []
          console.log('📋 Devis sauvegardés chargés:', quotes.length)
          quotes.forEach((q: SavedQuote) => {
            console.log(`  - "${q.title}" (${q.id}) - ${q.status} - Étape: ${q.step}`)
          })
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
        console.error('Erreur chargement commandes:', error)
        toast({
          title: t('common.error'),
          description: t('orders.errorLoadingOrders'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
  }, [router, toast, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : locale === 'nl' ? 'nl-NL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : locale === 'nl' ? 'nl-NL' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <h1 className="text-3xl font-bold mb-2">{t('orders.title')}</h1>
        <p className="text-muted-foreground">
          {t('orders.description')}
        </p>
      </div>

      <Tabs defaultValue="quotes" className="w-full">
        <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="quotes">
            {t('orders.savedQuotes')} ({savedQuotes.length})
          </TabsTrigger>
          <TabsTrigger value="orders">
            {t('orders.validatedOrders')} ({orders.length})
          </TabsTrigger>
        </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true)
              loadData()
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh') || 'Actualiser'}
          </Button>
        </div>

        <TabsContent value="quotes" className="space-y-4">
          {savedQuotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg text-gray-600">{t('orders.noQuotes')}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t('orders.noQuotesDescription')}
                </p>
                <Button onClick={() => router.push('/')} className="mt-4">
                  {t('orders.createQuote')}
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
                          {quote.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {t('orders.createdOn')} {formatDate(quote.createdAt)}
                          {quote.updatedAt !== quote.createdAt && (
                            <span> • {t('orders.modifiedOn')} {formatDate(quote.updatedAt)}</span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={quote.status === 'draft' ? 'default' : 'secondary'}>
                          {quote.status === 'draft' ? t('orders.draft') : quote.status}
                        </Badge>
                        {quote.odooOrderId && (
                          <Badge variant="outline">
                            Odoo #{quote.odooOrderId}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        {t('orders.currentStep')}: <strong>{quote.step}</strong>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/quotes/${quote.id}`)
                              
                              // Vérifier si l'utilisateur n'est pas authentifié
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
                                // Sauvegarder le devis dans localStorage pour le charger
                                localStorage.setItem('inkoo_pro_quote_to_load', JSON.stringify({
                                  quoteId: quote.id,
                                  quote: data.quote,
                                }))
                                router.push(`/${locale}/quote`)
                              } else {
                                toast({
                                  title: t('common.error'),
                                  description: data.error || t('orders.errorLoadingQuote'),
                                  variant: 'destructive',
                                })
                              }
                            } catch (error) {
                              console.error('Erreur chargement devis:', error)
                              toast({
                                title: t('common.error'),
                                description: t('orders.errorLoadingQuote'),
                                variant: 'destructive',
                              })
                            }
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t('orders.edit')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg text-gray-600">{t('orders.noOrders')}</p>
            <p className="text-sm text-gray-500 mt-2">
              {t('orders.noOrdersDescription')}
            </p>
            <Button onClick={() => router.push('/')} className="mt-4">
              {t('orders.createQuote')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {order.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {t('orders.orderNumber', { id: order.id })}
                    </CardDescription>
                  </div>
                  <Badge
                    className={`${getOrderStateColor(order.state)} text-white`}
                  >
                    {translateOrderState(order.state)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">{t('orders.orderDate')}</p>
                      <p className="font-medium">{formatDate(order.date_order)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">{t('orders.totalAmount')}</p>
                      <p className="font-medium text-lg">{formatPrice(order.amount_total)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">{t('orders.orderLines')}</p>
                      <p className="font-medium">{order.order_line?.length || 0} {order.order_line?.length === 1 ? t('orders.article') : t('orders.articles')}</p>
                    </div>
                  </div>
                </div>
                {order.note && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      <strong>{t('orders.note')}:</strong> {order.note}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

