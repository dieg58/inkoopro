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
        status: 'approved',
        approvedAt: new Date(),
        // approvedBy: 'admin-id' // TODO: Récupérer l'ID de l'admin depuis la session
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Client approuvé avec succès',
      client,
    })
  } catch (error) {
    console.error('Erreur API admin approve client:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

