import { NextRequest, NextResponse } from 'next/server'
import { syncProductsFromOdoo } from '@/lib/products-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceRefresh = body.forceRefresh === true
    const limit = body.limit ? parseInt(body.limit) : undefined // Limite optionnelle (undefined = tous les produits)
    
    console.log('🔄 Synchronisation des produits demandée...', { forceRefresh, limit: limit || 'tous' })
    
    // Si limit n'est pas défini, synchroniser tous les produits
    const syncLimit = limit
    
    const result = await syncProductsFromOdoo(forceRefresh, syncLimit)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${result.count} produit(s) synchronisé(s) avec succès`,
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
    console.error('Erreur API products/sync:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

