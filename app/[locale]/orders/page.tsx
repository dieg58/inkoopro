'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Package, Calendar, Euro, FileText, RefreshCw, Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OdooOrder, OdooOrderLine } from '@/lib/odoo-orders'
import { translateOrderState, getOrderStateColor, translateProjectState, getProjectStateColor, translateDeliveryState, getDeliveryStateColor } from '@/lib/odoo-orders'
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
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [orderDetails, setOrderDetails] = useState<Record<number, { lines: OdooOrderLine[]; loading: boolean }>>({})

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

  const toggleOrder = async (orderId: number) => {
    const isExpanded = expandedOrders.has(orderId)
    
    if (isExpanded) {
      // Replier
      setExpandedOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    } else {
      // Déplier - charger les détails si pas déjà chargés
      setExpandedOrders(prev => new Set(prev).add(orderId))
      
      if (!orderDetails[orderId]) {
        setOrderDetails(prev => ({
          ...prev,
          [orderId]: { lines: [], loading: true },
        }))

        try {
          const response = await fetch(`/api/orders/${orderId}`)
          const data = await response.json()

          if (data.success) {
            setOrderDetails(prev => ({
              ...prev,
              [orderId]: { lines: data.lines || [], loading: false },
            }))
          } else {
            toast({
              title: 'Erreur',
              description: 'Impossible de charger les détails de la commande',
              variant: 'destructive',
            })
            setOrderDetails(prev => ({
              ...prev,
              [orderId]: { lines: [], loading: false },
            }))
          }
        } catch (error) {
          console.error('Erreur lors du chargement des détails:', error)
          toast({
            title: 'Erreur',
            description: 'Erreur lors du chargement des détails',
            variant: 'destructive',
          })
          setOrderDetails(prev => ({
            ...prev,
            [orderId]: { lines: [], loading: false },
          }))
        }
      }
    }
  }

  // Filtrer et trier les commandes
  const filteredAndSortedOrders = orders
    .filter((order) => {
      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = order.name?.toLowerCase().includes(query)
        const matchesTitle = order.title?.toLowerCase().includes(query)
        const matchesId = order.id.toString().includes(query)
        if (!matchesName && !matchesTitle && !matchesId) return false
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
                  placeholder="Rechercher par titre, nom ou numéro de commande..."
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
            {filteredAndSortedOrders.map((order) => {
              const isExpanded = expandedOrders.has(order.id)
              const details = orderDetails[order.id]
              
              return (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {order.title || order.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {order.title && order.name !== order.title && (
                            <span className="block text-xs text-muted-foreground mb-1">
                              {order.name}
                            </span>
                          )}
                          Commande #{order.id}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge
                          className={`${getOrderStateColor(order.state)} !text-white !border-transparent shadow-sm`}
                        >
                          {translateOrderState(order.state)}
                        </Badge>
                        {order.project_state && (
                          <Badge
                            className={`${getProjectStateColor(order.project_state)} !text-white !border-transparent shadow-sm font-medium`}
                          >
                            {translateProjectState(order.project_state)}
                          </Badge>
                        )}
                        {order.delivery_state && (
                          <Badge
                            className={`${getDeliveryStateColor(order.delivery_state)} !text-white !border-transparent shadow-sm font-medium`}
                          >
                            Livraison: {translateDeliveryState(order.delivery_state)}
                          </Badge>
                        )}
                      </div>
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
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOrder(order.id)}
                          className="w-full"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Masquer les détails
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Voir les détails
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {order.note && (
                      <div className="mt-4 p-3 bg-background-subtle rounded-md border border-border">
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">Note:</strong> {order.note}
                        </p>
                      </div>
                    )}
                    {isExpanded && (
                      <div className="mt-6 border-t pt-4">
                        <h3 className="text-lg font-semibold mb-4">Détails de la commande</h3>
                        {details?.loading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">Chargement des détails...</span>
                          </div>
                        ) : details?.lines && details.lines.length > 0 ? (
                          <div className="space-y-4">
                            {(() => {
                              // Grouper les lignes par produit
                              const groupedByProduct = new Map<string, OdooOrderLine[]>()
                              
                              details.lines.forEach((line) => {
                                const productId = Array.isArray(line.product_id) 
                                  ? line.product_id[0].toString() 
                                  : line.product_id?.toString() || 'unknown'
                                const productName = Array.isArray(line.product_id) 
                                  ? line.product_id[1] 
                                  : line.name || 'Produit'
                                
                                // Utiliser le nom du produit comme clé pour regrouper
                                const key = `${productId}-${productName}`
                                
                                if (!groupedByProduct.has(key)) {
                                  groupedByProduct.set(key, [])
                                }
                                groupedByProduct.get(key)!.push(line)
                              })
                              
                              return Array.from(groupedByProduct.entries()).map(([key, lines]) => {
                                const firstLine = lines[0]
                                const productName = Array.isArray(firstLine.product_id) 
                                  ? firstLine.product_id[1] 
                                  : firstLine.name || 'Produit'
                                
                                // Collecter toutes les tailles uniques pour ce produit
                                const allSizes = new Set<string>()
                                let totalQuantity = 0
                                let totalSubtotal = 0
                                
                                lines.forEach((line) => {
                                  totalQuantity += line.product_uom_qty
                                  totalSubtotal += line.price_subtotal
                                  if (line.sizes && line.sizes.length > 0) {
                                    line.sizes.forEach(size => allSizes.add(size))
                                  }
                                })
                                
                                const sortedSizes = Array.from(allSizes).sort((a, b) => {
                                  // Trier les tailles : S, M, L, XL, 2XL, etc.
                                  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
                                  const indexA = sizeOrder.indexOf(a.toUpperCase())
                                  const indexB = sizeOrder.indexOf(b.toUpperCase())
                                  if (indexA !== -1 && indexB !== -1) return indexA - indexB
                                  if (indexA !== -1) return -1
                                  if (indexB !== -1) return 1
                                  return a.localeCompare(b)
                                })
                                
                                return (
                                  <div key={key} className="p-4 bg-background-subtle rounded-md border border-border">
                                    <div className="flex justify-between items-start mb-3">
                                      <div className="flex-1">
                                        <p className="font-medium text-foreground">{productName}</p>
                                        {firstLine.name && firstLine.name !== productName && (
                                          <p className="text-sm text-muted-foreground mt-1">{firstLine.name}</p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-foreground">
                                          {formatCurrency(totalSubtotal)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Quantité totale: {totalQuantity}
                                        </p>
                                      </div>
                                    </div>
                                    {sortedSizes.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-border">
                                        <p className="text-sm font-medium text-foreground mb-2">Tailles:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {sortedSizes.map((size) => (
                                            <Badge key={size} variant="outline" className="font-normal">
                                              {size}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Aucun détail disponible pour cette commande
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
