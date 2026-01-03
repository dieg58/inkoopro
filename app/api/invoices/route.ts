import { NextRequest, NextResponse } from 'next/server'
import { getClientFromSession } from '@/lib/odoo-auth'
import { getInvoicesFromOdoo } from '@/lib/odoo-invoices'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification du client
    const client = await getClientFromSession()
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier que le client a un partnerId Odoo
    if (!client.partnerId) {
      return NextResponse.json(
        { success: false, error: 'Client non lié à Odoo' },
        { status: 400 }
      )
    }

    // Récupérer les factures depuis Odoo
    const invoices = await getInvoicesFromOdoo(client.partnerId)

    return NextResponse.json({
      success: true,
      invoices,
    })
  } catch (error) {
    console.error('Erreur récupération factures:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

