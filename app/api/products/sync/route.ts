import { NextRequest, NextResponse } from 'next/server'
import { syncProductsFromOdoo } from '@/lib/products-db'

// Vercel Pro = 60 secondes max, on peut synchroniser plus de produits en une seule fois
export const maxDuration = 60 // 60 secondes maximum (Vercel Pro)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceRefresh = body.forceRefresh === true
    const limit = body.limit ? parseInt(body.limit) : undefined
    const offset = body.offset ? parseInt(body.offset) : 0 // Offset pour la synchronisation progressive
    const batchSize = body.batchSize ? parseInt(body.batchSize) : 1000 // Taille du lot par défaut (augmentée avec Vercel Pro)
    
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
      // Pas de limite totale = synchroniser TOUS les produits
      // IMPORTANT: On passe undefined pour permettre à getProductsFromOdoo de continuer la pagination
      // jusqu'à ce qu'il n'y ait plus de produits
      syncLimit = undefined
    }
    
    // Synchroniser ce lot
    // IMPORTANT: Si limit n'est pas fourni, on passe undefined pour permettre la pagination complète
    const result = await syncProductsFromOdoo(forceRefresh, syncLimit, offset)
    
    if (result.success) {
      const completed = limit ? (offset + result.count >= limit) : false
      // Si on a récupéré exactement le nombre demandé (batchSize), il y a probablement plus de produits
      // Si on a récupéré moins que batchSize, on a probablement atteint la fin
      // Si limit n'est pas défini, on continue tant qu'on récupère batchSize produits
      const hasMore = !completed && result.count >= batchSize
      
      return NextResponse.json({
        success: true,
        message: `${result.count} produit(s) synchronisé(s) dans ce lot`,
        count: result.count,
        offset: offset + result.count,
        completed: completed || result.count < batchSize, // Terminé si on a récupéré moins que batchSize
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

