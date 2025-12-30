import { NextRequest, NextResponse } from 'next/server'
import { loadDeliveryOdooMapping, saveDeliveryOdooMapping, initializeDefaultDeliveryMappings } from '@/lib/delivery-odoo-mapping-db'

export async function GET(request: NextRequest) {
  try {
    // Initialiser les mappings par défaut si nécessaire
    await initializeDefaultDeliveryMappings()
    
    const mappings = await loadDeliveryOdooMapping()
    return NextResponse.json({ success: true, mappings })
  } catch (error) {
    console.error('Erreur API delivery-odoo-mapping GET:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mappings } = body

    if (!Array.isArray(mappings)) {
      return NextResponse.json(
        { success: false, error: 'mappings doit être un tableau' },
        { status: 400 }
      )
    }

    // Sauvegarder chaque mapping
    for (const mapping of mappings) {
      await saveDeliveryOdooMapping(mapping)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur API delivery-odoo-mapping POST:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la sauvegarde' },
      { status: 500 }
    )
  }
}

