import { NextRequest, NextResponse } from 'next/server'
import { loadServicePricing } from '@/lib/service-pricing-db'

// Désactiver le cache pour toujours récupérer les dernières données
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET - Récupérer les prix des services (route publique pour les clients)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier si on doit forcer le rechargement (pour éviter le cache)
    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    console.log('📥 Chargement des prix des services', { forceRefresh })
    const pricing = await loadServicePricing(forceRefresh)
    
    // Vérifier que les prix de sérigraphie sont bien chargés
    const serigraphiePricing = pricing.find(p => p.technique === 'serigraphie')
    if (serigraphiePricing) {
      const serigraphie = serigraphiePricing as any
      console.log('✅ Prix sérigraphie chargés:', {
        hasPricesClair: !!serigraphie.pricesClair,
        hasPricesFonce: !!serigraphie.pricesFonce,
        hasPrices: !!serigraphie.prices,
        sampleKeysClair: serigraphie.pricesClair ? Object.keys(serigraphie.pricesClair).slice(0, 5) : [],
        fixedFeePerColor: serigraphie.fixedFeePerColor,
      })
    } else {
      console.warn('⚠️ Aucun prix de sérigraphie trouvé dans la base de données')
    }
    
    const response = NextResponse.json({ success: true, pricing })
    
    // Désactiver le cache du navigateur pour éviter les problèmes
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    
    return response
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des prix:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des prix' },
      { status: 500 }
    )
  }
}

