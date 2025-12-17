import { NextRequest, NextResponse } from 'next/server'
import { loadServiceOdooMapping, saveServiceOdooMapping, initializeDefaultMappings } from '@/lib/service-odoo-mapping-db'

export async function GET(request: NextRequest) {
  try {
    // Initialiser les mappings par défaut si nécessaire
    await initializeDefaultMappings()
    
    const mappings = await loadServiceOdooMapping()
    return NextResponse.json({ success: true, mappings })
  } catch (error) {
    console.error('Erreur API service-odoo-mapping GET:', error)
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
      await saveServiceOdooMapping(mapping)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur API service-odoo-mapping POST:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la sauvegarde' },
      { status: 500 }
    )
  }
}

