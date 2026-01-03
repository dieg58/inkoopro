import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token et mot de passe requis' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      )
    }

    console.log('🔐 Réinitialisation du mot de passe avec token:', token.substring(0, 10) + '...')

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

    // Vérifier que le client a un mot de passe (compte local, pas Odoo uniquement)
    if (!client.password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ce compte ne peut pas être réinitialisé via ce formulaire',
          message: 'Ce compte est géré par Odoo. Veuillez contacter votre administrateur.',
        },
        { status: 400 }
      )
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Mettre à jour le mot de passe et supprimer le token
    await prisma.client.update({
      where: { id: client.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    })

    console.log('✅ Mot de passe réinitialisé avec succès pour:', client.email)

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    })
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation du mot de passe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la réinitialisation du mot de passe',
        message: 'Une erreur est survenue. Veuillez réessayer.',
      },
      { status: 500 }
    )
  }
}

