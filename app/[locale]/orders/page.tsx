'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Package, Calendar, Euro, FileText, RefreshCw, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OdooOrder } from '@/lib/odoo-orders'
import { translateOrderState, getOrderStateColor } from '@/lib/odoo-orders'
import { LanguageSelector } from '@/components/LanguageSelector'

export default function OrdersPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations()
  const { toast } = useToast()
  const [orders, setOrders] = useState<OdooOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

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
    }).format(date)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  // Filtrer et trier les commandes
  const filteredAndSortedOrders = orders
    .filter((order) => {
      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = order.name?.toLowerCase().includes(query)
        const matchesId = order.id.toString().includes(query)
        if (!matchesName && !matchesId) return false
      }

      // Filtre par statut
      if (statusFilter !== 'all') {
        if (order.state !== statusFilter) return false
      }

      return true
    })
    .sort((a, b) => {
      let comparison = 0

      if (sortBy === 'date') {
        const dateA = new Date(a.date_order || 0).getTime()
        const dateB = new Date(b.date_order || 0).getTime()
        comparison = dateA - dateB
      } else if (sortBy === 'amount') {
        comparison = (a.amount_total || 0) - (b.amount_total || 0)
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Obtenir les statuts uniques pour le filtre
  const uniqueStates = Array.from(new Set(orders.map(order => order.state))).filter(Boolean)

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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Mes commandes</h1>
            <p className="text-muted-foreground">Consultez vos commandes validées et en cours</p>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true)
                loadData()
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Recherche */}
              <div className="md:col-span-2">
                <Input
                  placeholder="Rechercher par nom ou numéro de commande..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Filtre par statut */}
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {uniqueStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {translateOrderState(state)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tri */}
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'date' | 'amount')}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Montant</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>

            {/* Indicateur de filtres actifs */}
            {(searchQuery || statusFilter !== 'all') && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filtres actifs:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Recherche: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery('')}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Statut: {translateOrderState(statusFilter)}
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className="h-6 text-xs"
                >
                  Réinitialiser
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résultats */}
        {filteredAndSortedOrders.length === 0 && orders.length > 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Aucune commande ne correspond aux filtres</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                }}
                className="mt-4"
              >
                Réinitialiser les filtres
              </Button>
            </CardContent>
          </Card>
        ) : filteredAndSortedOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">{t('orders.noOrders')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('orders.noOrdersDescription')}
              </p>
              <Button onClick={() => router.push(`/${locale}/quote`)} className="mt-4">
                Créer un devis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              {filteredAndSortedOrders.length} commande{filteredAndSortedOrders.length > 1 ? 's' : ''} trouvée{filteredAndSortedOrders.length > 1 ? 's' : ''}
              {orders.length !== filteredAndSortedOrders.length && ` sur ${orders.length}`}
            </div>
            {filteredAndSortedOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {order.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Commande #{order.id}
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
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Date de commande</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(order.date_order)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Montant total</p>
                      <p className="font-semibold text-lg flex items-center gap-2">
                        <Euro className="h-4 w-4" />
                        {formatCurrency(order.amount_total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Statut</p>
                      <Badge className={getOrderStateColor(order.state)}>
                        {translateOrderState(order.state)}
                      </Badge>
                    </div>
                  </div>
                  {order.note && (
                    <div className="mt-4 p-3 bg-background-subtle rounded-md border border-border">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Note:</strong> {order.note}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
