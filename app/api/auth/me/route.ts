import { NextRequest, NextResponse } from 'next/server'
import { getClientFromSession } from '@/lib/odoo-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const client = await getClientFromSession()

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      client,
    })
  } catch (error) {
    console.error('Erreur API me:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

