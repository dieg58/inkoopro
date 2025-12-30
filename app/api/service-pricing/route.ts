import { NextResponse } from 'next/server'
import { loadServicePricing } from '@/lib/service-pricing-db'

/**
 * GET - Récupérer les prix des services (route publique pour les clients)
 */
export async function GET() {
  try {
    const pricing = await loadServicePricing()
    const response = NextResponse.json({ success: true, pricing })
    
    // Cache les prix des services (10 minutes) - ils changent rarement
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')
    
    return response
  } catch (error) {
    console.error('Erreur lors de la récupération des prix:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des prix' },
      { status: 500 }
    )
  }
}

