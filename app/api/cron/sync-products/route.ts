import { NextRequest, NextResponse } from 'next/server'
import { syncProductsFromOdoo } from '@/lib/products-db'

// Route pour Vercel Cron Jobs - synchronisation automatique
// Configurer dans vercel.json avec un cron job
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vérifier que la requête vient de Vercel Cron (sécurité)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    console.log('🔄 Synchronisation automatique des produits (Cron Job)...')
    
    // Synchroniser par petits lots pour éviter le timeout
    const BATCH_SIZE = 200
    let offset = 0
    let totalSynced = 0
    let hasMore = true
    const maxIterations = 10 // Limiter à 10 itérations max (2000 produits) pour éviter le timeout
    
    for (let i = 0; i < maxIterations && hasMore; i++) {
      const result = await syncProductsFromOdoo(true, BATCH_SIZE, offset)
      
      if (result.success && result.count > 0) {
        totalSynced += result.count
        offset += result.count
        hasMore = result.count === BATCH_SIZE // Si on a récupéré exactement BATCH_SIZE, il y a probablement plus
        console.log(`✅ Lot ${i + 1}: ${result.count} produit(s) synchronisé(s) (total: ${totalSynced})`)
      } else {
        hasMore = false
      }
      
      // Petite pause entre les lots
      if (hasMore && i < maxIterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée: ${totalSynced} produit(s) synchronisé(s)`,
      count: totalSynced,
    })
  } catch (error) {
    console.error('Erreur synchronisation cron:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

