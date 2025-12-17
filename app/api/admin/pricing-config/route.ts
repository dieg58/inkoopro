import { NextRequest, NextResponse } from 'next/server'
import { loadPricingConfig, savePricingConfig, PricingConfig } from '@/lib/pricing-config-db'

/**
 * GET - Récupérer la configuration des facteurs de prix
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

/**
 * POST - Sauvegarder la configuration des facteurs de prix
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config } = body as { config: PricingConfig }

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Données invalides' },
        { status: 400 }
      )
    }

    await savePricingConfig(config)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la sauvegarde de la configuration' },
      { status: 500 }
    )
  }
}

