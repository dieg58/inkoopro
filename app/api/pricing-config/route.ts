import { NextResponse } from 'next/server'
import { loadPricingConfig } from '@/lib/pricing-config-db'

/**
 * GET - Récupérer la configuration des prix (route publique pour les clients)
 */
export async function GET() {
  try {
    const config = await loadPricingConfig()
    const response = NextResponse.json({ success: true, config })
    
    // Cache la configuration (5 minutes) - elle change peu souvent
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    )
  }
}

