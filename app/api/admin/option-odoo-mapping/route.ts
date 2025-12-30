import { NextRequest, NextResponse } from 'next/server'
import { loadOptionOdooMapping, saveOptionOdooMapping, initializeDefaultOptionMappings } from '@/lib/option-odoo-mapping-db'

export async function GET(request: NextRequest) {
  try {
    await initializeDefaultOptionMappings()
    const mappings = await loadOptionOdooMapping()
    return NextResponse.json({ success: true, mappings })
  } catch (error) {
    console.error('Erreur API option-odoo-mapping GET:', error)
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

    for (const mapping of mappings) {
      await saveOptionOdooMapping(mapping)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur API option-odoo-mapping POST:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la sauvegarde' },
      { status: 500 }
    )
  }
}

