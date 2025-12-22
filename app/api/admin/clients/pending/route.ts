import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

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
    console.error('Erreur API admin clients pending:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

