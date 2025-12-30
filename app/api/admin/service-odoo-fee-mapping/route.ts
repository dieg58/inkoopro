import { NextRequest, NextResponse } from 'next/server'
import { 
  loadServiceOdooFeeMappings, 
  saveServiceOdooFeeMappings,
  deleteServiceOdooFeeMapping,
  ServiceOdooFeeMapping 
} from '@/lib/service-odoo-fee-mapping-db'

/**
 * GET - Récupérer tous les mappings de frais fixes et options
 */
export async function GET() {
  try {
    const mappings = await loadServiceOdooFeeMappings()
    return NextResponse.json({ success: true, mappings })
  } catch (error) {
    console.error('Erreur lors de la récupération des mappings:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des mappings' },
      { status: 500 }
    )
  }
}

/**
 * POST - Sauvegarder les mappings de frais fixes et options
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Requête POST service-odoo-fee-mapping:', body)
    
    const { mappings, deleteIds } = body as { 
      mappings?: ServiceOdooFeeMapping[]
      deleteIds?: string[]
    }

    // Supprimer les mappings demandés
    if (deleteIds && deleteIds.length > 0) {
      console.log('🗑️ Suppression de mappings:', deleteIds)
      for (const id of deleteIds) {
        await deleteServiceOdooFeeMapping(id)
      }
    }

    // Sauvegarder les mappings
    if (mappings && mappings.length > 0) {
      console.log(`💾 Sauvegarde de ${mappings.length} mapping(s)`)
      await saveServiceOdooFeeMappings(mappings)
      console.log('✅ Mappings sauvegardés avec succès')
    } else {
      console.log('⚠️ Aucun mapping à sauvegarder')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des mappings:', error)
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

