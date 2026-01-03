import { NextRequest, NextResponse } from 'next/server'
import { syncProductsFromOdoo } from '@/lib/products-db'

// Route pour synchronisation asynchrone - retourne immédiatement et continue en arrière-plan
export const dynamic = 'force-dynamic'
// Vercel Pro = 60 secondes max
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceRefresh = body.forceRefresh === true
    
    console.log('🔄 Démarrage synchronisation asynchrone...')
    
    // Retourner immédiatement une réponse
    const response = NextResponse.json({
      success: true,
      message: 'Synchronisation démarrée en arrière-plan',
      status: 'started',
    })
    
    // Démarrer la synchronisation en arrière-plan (ne pas attendre)
    // Note: Avec Vercel Pro (60s), on a plus de temps pour la synchronisation
    syncProductsFromOdoo(forceRefresh).catch(error => {
      console.error('Erreur synchronisation asynchrone:', error)
    })
    
    return response
  } catch (error) {
    console.error('Erreur API products/sync/async:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

