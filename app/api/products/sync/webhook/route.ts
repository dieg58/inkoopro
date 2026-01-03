import { NextRequest, NextResponse } from 'next/server'
import { syncProductsFromOdoo } from '@/lib/products-db'

// Route webhook pour Odoo - synchronisation déclenchée par Odoo
export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification (optionnel - vous pouvez ajouter un secret)
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.ODOO_WEBHOOK_SECRET
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json().catch(() => ({}))
    const productIds = body.product_ids || [] // IDs des produits modifiés (optionnel)
    
    console.log('🔄 Webhook Odoo: Synchronisation des produits...', { 
      productCount: productIds.length,
      hasSpecificProducts: productIds.length > 0 
    })
    
    // Si des IDs spécifiques sont fournis, on pourrait synchroniser uniquement ceux-là
    // Pour l'instant, on synchronise un petit lot pour éviter le timeout
    const BATCH_SIZE = 200
    const result = await syncProductsFromOdoo(true, BATCH_SIZE, 0)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${result.count} produit(s) synchronisé(s)`,
        count: result.count,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Erreur lors de la synchronisation',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erreur webhook products/sync:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

