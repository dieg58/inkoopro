'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ArrowLeft, Package, Calendar, Euro, FileText } from 'lucide-react'
import { OdooOrder } from '@/lib/odoo-orders'
import { translateOrderState, getOrderStateColor } from '@/lib/odoo-orders'

export default function OrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<OdooOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Vérifier l'authentification
        const clientResponse = await fetch('/api/auth/me')
        const clientData = await clientResponse.json()
        
        if (!clientData.success || !clientData.client) {
          router.push('/login')
          return
        }

        setClient(clientData.client)

        // Charger les commandes
        const ordersResponse = await fetch('/api/orders')
        const ordersData = await ordersResponse.json()

        if (ordersData.success) {
          setOrders(ordersData.orders || [])
        } else {
          toast({
            title: 'Erreur',
            description: ordersData.error || 'Impossible de charger les commandes',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Erreur chargement commandes:', error)
        toast({
          title: 'Erreur',
          description: 'Erreur lors du chargement des commandes',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, toast])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
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
          Retour
        </Button>
        <h1 className="text-3xl font-bold mb-2">Mes commandes</h1>
        <p className="text-muted-foreground">
          Consultez l'historique de toutes vos commandes
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg text-gray-600">Aucune commande trouvée</p>
            <p className="text-sm text-gray-500 mt-2">
              Vous n'avez pas encore de commandes dans notre système.
            </p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Créer un devis
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
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Date de commande</p>
                      <p className="font-medium">{formatDate(order.date_order)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Montant total</p>
                      <p className="font-medium text-lg">{formatPrice(order.amount_total)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Lignes de commande</p>
                      <p className="font-medium">{order.order_line?.length || 0} article(s)</p>
                    </div>
                  </div>
                </div>
                {order.note && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      <strong>Note:</strong> {order.note}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

