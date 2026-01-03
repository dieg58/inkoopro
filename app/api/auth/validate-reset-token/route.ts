import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token requis' },
        { status: 400 }
      )
    }

    console.log('🔍 Validation du token de réinitialisation:', token.substring(0, 10) + '...')

    // Chercher le client avec ce token
    const client = await prisma.client.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(), // Token non expiré
        },
      },
    })

    if (!client) {
      console.log('❌ Token invalide ou expiré')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token invalide ou expiré',
          message: 'Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.',
        },
        { status: 400 }
      )
    }

    console.log('✅ Token valide pour:', client.email)

    return NextResponse.json({
      success: true,
      message: 'Token valide',
    })
  } catch (error) {
    console.error('❌ Erreur lors de la validation du token:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la validation du token',
        message: 'Une erreur est survenue. Veuillez réessayer.',
      },
      { status: 500 }
    )
  }
}

