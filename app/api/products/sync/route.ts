import { NextRequest, NextResponse } from 'next/server'
import { syncProductsFromOdoo } from '@/lib/products-db'

// Vercel gratuit = 10 secondes max, donc on synchronise par petits lots
export const maxDuration = 10 // 10 secondes maximum (limite Vercel gratuit)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceRefresh = body.forceRefresh === true
    const limit = body.limit ? parseInt(body.limit) : undefined
    const offset = body.offset ? parseInt(body.offset) : 0 // Offset pour la synchronisation progressive
    const batchSize = body.batchSize ? parseInt(body.batchSize) : 200 // Taille du lot par défaut
    
    console.log('🔄 Synchronisation des produits demandée...', { 
      forceRefresh, 
      limit: limit || 'tous',
      offset,
      batchSize 
    })
    
    // Calculer la limite pour ce lot
    let syncLimit: number | undefined
    if (limit) {
      // Si une limite totale est spécifiée, calculer combien on peut encore synchroniser
      syncLimit = Math.min(batchSize, limit - offset)
      if (syncLimit <= 0) {
        return NextResponse.json({
          success: true,
          message: 'Synchronisation terminée',
          count: 0,
          completed: true,
          offset: offset,
        })
      }
    } else {
      // Pas de limite totale, synchroniser juste ce lot
      syncLimit = batchSize
    }
    
    // Synchroniser ce lot
    const result = await syncProductsFromOdoo(forceRefresh, syncLimit, offset)
    
    if (result.success) {
      const completed = limit ? (offset + result.count >= limit) : false
      const hasMore = !completed && result.count === syncLimit // Si on a récupéré exactement le nombre demandé, il y a probablement plus
      
      return NextResponse.json({
        success: true,
        message: `${result.count} produit(s) synchronisé(s) dans ce lot`,
        count: result.count,
        offset: offset + result.count,
        completed: completed || !hasMore,
        hasMore: hasMore,
        totalSynced: offset + result.count,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Erreur lors de la synchronisation',
          offset: offset,
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

