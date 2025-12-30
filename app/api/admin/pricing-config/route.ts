import { NextRequest, NextResponse } from 'next/server'
import { loadPricingConfig, savePricingConfig, PricingConfig } from '@/lib/pricing-config-db'

// Désactiver le cache pour toujours récupérer les dernières données
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET - Récupérer la configuration des facteurs de prix
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier si on doit forcer le rechargement (pour éviter le cache)
    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    console.log('📥 Requête GET pour récupérer la configuration des prix', { forceRefresh })
    const config = await loadPricingConfig(forceRefresh)
    console.log('✅ Configuration chargée:', config)
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la configuration:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('   Détails:', errorMessage)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération de la configuration',
        details: errorMessage 
      },
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
      console.error('❌ Données invalides: config est manquant')
      return NextResponse.json(
        { success: false, error: 'Données invalides: configuration manquante' },
        { status: 400 }
      )
    }

    console.log('💾 Tentative de sauvegarde de la configuration:', config)
    await savePricingConfig(config)
    console.log('✅ Configuration sauvegardée avec succès')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration:', error)
    
    let errorMessage = 'Erreur inconnue'
    let errorDetails: any = {}
    
    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }
      
      // Vérifier si c'est une erreur Prisma
      if ('code' in error) {
        errorDetails.code = (error as any).code
      }
      if ('meta' in error) {
        errorDetails.meta = (error as any).meta
      }
    }
    
    console.error('   Détails complets:', JSON.stringify(errorDetails, null, 2))
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la sauvegarde de la configuration',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { errorDetails }),
      },
      { status: 500 }
    )
  }
}

