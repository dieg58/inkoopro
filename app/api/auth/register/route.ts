import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, company, phone, street, city, zip, country } = await request.json()

    console.log('📝 Tentative d\'inscription pour:', email)

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nom, email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'email existe déjà
    const existingClient = await prisma.client.findUnique({
      where: { email },
    })

    if (existingClient) {
      return NextResponse.json(
        { success: false, error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Créer le client avec le statut "pending"
    const newClient = await prisma.client.create({
      data: {
        name,
        email,
        password: hashedPassword,
        company: company || null,
        phone: phone || null,
        street: street || null,
        city: city || null,
        zip: zip || null,
        country: country || null,
        status: 'pending',
      },
    })

    console.log('✅ Inscription créée avec succès, ID:', newClient.id)

    return NextResponse.json({
      success: true,
      message: 'Inscription enregistrée. Votre compte sera activé après approbation par un administrateur.',
      clientId: newClient.id,
    })
  } catch (error) {
    console.error('❌ Erreur API register:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'inscription' },
      { status: 500 }
    )
  }
}

