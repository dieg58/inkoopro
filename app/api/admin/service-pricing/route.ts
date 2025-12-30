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
    console.log('📥 Requête POST service-pricing:', { pricingCount: body.pricing?.length })
    
    const { pricing } = body as { pricing: ServicePricing[] }

    if (!pricing || !Array.isArray(pricing)) {
      console.error('❌ Données invalides:', { pricing: !!pricing, isArray: Array.isArray(pricing) })
      return NextResponse.json(
        { success: false, error: 'Données invalides: pricing doit être un tableau' },
        { status: 400 }
      )
    }

    console.log(`💾 Sauvegarde de ${pricing.length} configuration(s) de prix`)
    await saveServicePricing(pricing)
    console.log('✅ Prix sauvegardés avec succès')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des prix:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error('📋 Détails de l\'erreur:', errorDetails)
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}

