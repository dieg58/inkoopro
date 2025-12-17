import { NextResponse } from 'next/server'
import { loadPricingConfig } from '@/lib/pricing-config-db'

/**
 * GET - Récupérer la configuration des prix (route publique pour les clients)
 */
export async function GET() {
  try {
    const config = await loadPricingConfig()
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    )
  }
}

