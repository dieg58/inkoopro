import { NextRequest, NextResponse } from 'next/server'
import { getClientFromSession } from '@/lib/odoo-auth'
import { getOrderDetails } from '@/lib/odoo-orders'
import { getClientOrders } from '@/lib/odoo-orders'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification du client
    const client = await getClientFromSession()
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié. Veuillez vous connecter.' },
        { status: 401 }
      )
    }

    const { id } = await params
    const orderId = parseInt(id)
    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: 'ID de commande invalide' },
        { status: 400 }
      )
    }

    // Vérifier d'abord que la commande appartient au client en récupérant toutes ses commandes
    const clientOrders = await getClientOrders(client)
    const orderExists = clientOrders.some(o => o.id === orderId)
    
    if (!orderExists) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée ou accès non autorisé' },
        { status: 404 }
      )
    }

    // Récupérer les détails de la commande
    const { order, lines } = await getOrderDetails(orderId)

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      order,
      lines,
    })
  } catch (error) {
    console.error('Erreur API order details:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

