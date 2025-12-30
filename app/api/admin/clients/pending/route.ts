import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    const status = request.nextUrl.searchParams.get('status') || 'pending'
    console.log(`🔍 Recherche clients avec status: ${status}`)

    const clients = await prisma.client.findMany({
      where: {
        status: status as 'pending' | 'approved' | 'rejected',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      clients,
    })
  } catch (error) {
    console.error('❌ Erreur API admin clients pending:', error)
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

