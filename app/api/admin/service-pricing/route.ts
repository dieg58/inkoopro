import { NextRequest, NextResponse } from 'next/server'
import { loadServicePricing, saveServicePricing } from '@/lib/service-pricing-db'
import { ServicePricing } from '@/types'

/**
 * GET - Récupérer les prix des services
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

/**
 * POST - Sauvegarder les prix des services
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pricing } = body as { pricing: ServicePricing[] }

    if (!pricing || !Array.isArray(pricing)) {
      return NextResponse.json(
        { success: false, error: 'Données invalides' },
        { status: 400 }
      )
    }

    await saveServicePricing(pricing)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des prix:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la sauvegarde des prix' },
      { status: 500 }
    )
  }
}

