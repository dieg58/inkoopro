import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification admin
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('admin-auth')
    if (!authCookie || authCookie.value !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { id } = params

    const client = await prisma.client.update({
      where: { id },
      data: {
        status: 'rejected',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Client rejeté',
      client,
    })
  } catch (error) {
    console.error('❌ Erreur API admin reject client:', error)
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

