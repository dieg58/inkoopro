import { NextRequest, NextResponse } from 'next/server'
import { clearClientSession } from '@/lib/odoo-auth'

export async function POST(request: NextRequest) {
  try {
    await clearClientSession()

    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie',
    })
  } catch (error) {
    console.error('Erreur API logout:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

