import { NextResponse } from 'next/server'
import { loadServicePricing } from '@/lib/service-pricing-db'

/**
 * GET - Récupérer les prix des services (route publique pour les clients)
 */
export async function GET() {
  try {
    const pricing = await loadServicePricing()
    return NextResponse.json({ success: true, pricing })
  } catch (error) {
    console.error('Erreur lors de la récupération des prix:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des prix' },
      { status: 500 }
    )
  }
}

