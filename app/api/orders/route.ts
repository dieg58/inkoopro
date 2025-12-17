import { NextRequest, NextResponse } from 'next/server'
import { getClientFromSession } from '@/lib/odoo-auth'
import { getClientOrders } from '@/lib/odoo-orders'

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification du client
    const client = await getClientFromSession()
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié. Veuillez vous connecter.' },
        { status: 401 }
      )
    }

    // Récupérer les commandes du client depuis Odoo
    const orders = await getClientOrders(client)

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    })
  } catch (error) {
    console.error('Erreur API orders:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

