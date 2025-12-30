import { NextRequest, NextResponse } from 'next/server'
import { verifyClientCredentials, setClientSession } from '@/lib/odoo-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('🔐 Tentative de connexion pour:', email)

    if (!email || !password) {
      console.warn('⚠️  Email ou mot de passe manquant')
      return NextResponse.json(
        { success: false, error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // D'abord, vérifier si le client existe dans Odoo
    // On essaie de s'authentifier directement avec l'email et le mot de passe
    const odooResult = await verifyClientCredentials(email, password)

    if (odooResult.success && odooResult.client) {
      console.log('✅ Client trouvé dans Odoo, connexion réussie')
      // Créer la session
      await setClientSession(odooResult.client)

      // Optionnellement, synchroniser les données dans la base locale
      try {
        // Vérifier d'abord si DATABASE_URL est configuré
        if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
          console.warn('⚠️  DATABASE_URL non configuré ou SQLite, skip sync locale')
        } else {
          await prisma.client.upsert({
          where: { email },
          update: {
            odooId: odooResult.client.id,
            name: odooResult.client.name,
            company: odooResult.client.company || null,
            phone: odooResult.client.phone || null,
            street: odooResult.client.street || null,
            city: odooResult.client.city || null,
            zip: odooResult.client.zip || null,
            country: odooResult.client.country || null,
            status: 'approved', // Les clients Odoo sont automatiquement approuvés
          },
          create: {
            email: odooResult.client.email,
            odooId: odooResult.client.id,
            name: odooResult.client.name,
            company: odooResult.client.company || null,
            phone: odooResult.client.phone || null,
            street: odooResult.client.street || null,
            city: odooResult.client.city || null,
            zip: odooResult.client.zip || null,
            country: odooResult.client.country || null,
            status: 'approved', // Les clients Odoo sont automatiquement approuvés
          },
        })
      } catch (syncError) {
        console.warn('⚠️  Erreur lors de la synchronisation avec la base locale:', syncError)
        // On continue quand même, la connexion fonctionne
      }

      return NextResponse.json({
        success: true,
        client: odooResult.client,
      })
    }

    // Si le client n'existe pas dans Odoo, vérifier dans la base locale
    console.log('🔍 Client non trouvé dans Odoo, vérification dans la base locale...')
    let localClient = null
    try {
      localClient = await prisma.client.findUnique({
        where: { email },
      })
    } catch (dbError) {
      console.error('❌ Erreur lors de l\'accès à la base de données:', dbError)
      // Si c'est une erreur de connexion, on peut toujours essayer avec Odoo uniquement
      // ou retourner une erreur plus explicite
      if (dbError instanceof Error && (
        dbError.message.includes('Prisma') || 
        dbError.message.includes('DATABASE_URL') ||
        dbError.message.includes('connection')
      )) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Erreur de connexion à la base de données. Veuillez contacter l\'administrateur.' 
          },
          { status: 500 }
        )
      }
      throw dbError // Re-lancer les autres erreurs
    }

    if (localClient) {
      // Vérifier le statut
      if (localClient.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'Votre compte est en attente d\'approbation par un administrateur.' },
          { status: 403 }
        )
      }

      if (localClient.status === 'rejected') {
        return NextResponse.json(
          { success: false, error: 'Votre compte a été rejeté. Veuillez contacter l\'administrateur.' },
          { status: 403 }
        )
      }

      // Vérifier le mot de passe
      if (!localClient.password) {
        return NextResponse.json(
          { success: false, error: 'Erreur de configuration du compte' },
          { status: 500 }
        )
      }

      const isValidPassword = await bcrypt.compare(password, localClient.password)
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Mot de passe incorrect' },
          { status: 401 }
        )
      }

      // Créer la session avec les données locales
      const clientData = {
        id: localClient.odooId || parseInt(localClient.id) || 0,
        name: localClient.name,
        email: localClient.email,
        partnerId: localClient.odooId || parseInt(localClient.id) || 0,
        company: localClient.company || undefined,
        phone: localClient.phone || undefined,
        street: localClient.street || undefined,
        city: localClient.city || undefined,
        zip: localClient.zip || undefined,
        country: localClient.country || undefined,
      }

      await setClientSession(clientData)

      return NextResponse.json({
        success: true,
        client: clientData,
      })
    }

    // Si aucun compte trouvé ni dans Odoo ni dans la base locale
    console.error('❌ Aucun compte trouvé pour:', email)
    
    // Si la base locale n'est pas accessible et que Odoo n'a pas trouvé le client,
    // on retourne une erreur plus explicite
    if (!localClient && (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:'))) {
      // Si on n'a pas de base PostgreSQL configurée, on ne peut que se baser sur Odoo
      return NextResponse.json(
        { 
          success: false, 
          error: 'not_found',
          message: 'Vous n\'êtes pas encore client chez nous. Créez votre compte pour accéder à nos services !'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'not_found', // Code spécial pour identifier ce cas
        message: 'Vous n\'êtes pas encore client chez nous. Créez votre compte pour accéder à nos services !'
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('❌ Erreur API login:', error)
    
    // Log détaillé de l'erreur pour le debugging
    if (error instanceof Error) {
      console.error('❌ Détails de l\'erreur:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      })
      
      // Si c'est une erreur Prisma
      if (error.message.includes('Prisma') || error.message.includes('DATABASE_URL')) {
        console.error('❌ Erreur de connexion à la base de données')
        return NextResponse.json(
          { 
            success: false, 
            error: 'Erreur de connexion à la base de données. Veuillez contacter l\'administrateur.' 
          },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

