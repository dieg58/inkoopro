import { NextRequest, NextResponse } from 'next/server'
import { verifyClientCredentials, setClientSession } from '@/lib/odoo-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

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

    // D'abord, vérifier si le client existe dans la base locale avec un mot de passe
    console.log('🔍 Vérification dans la base locale...')
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

      // Vérifier le mot de passe - OBLIGATOIRE même pour les clients Odoo
      if (!localClient.password) {
        console.log('⚠️  Client trouvé mais pas de mot de passe local, demande de réinitialisation requise')
        return NextResponse.json(
          { 
            success: false, 
            error: 'no_password',
            message: 'Vous devez définir un mot de passe pour votre compte. Utilisez "Mot de passe oublié" pour créer votre mot de passe.' 
          },
          { status: 403 }
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

      // Créer aussi le cookie directement dans la réponse pour s'assurer qu'il est bien défini
      const response = NextResponse.json({
        success: true,
        client: clientData,
      })
      
      // Définir le cookie dans la réponse
      response.cookies.set('odoo_client', JSON.stringify(clientData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 jours
        path: '/', // Important : le cookie doit être disponible sur tout le site
      })
      
      return response
    }

    // Si aucun compte trouvé dans la base locale, vérifier si le client existe dans Odoo
    // Si oui, il doit créer un mot de passe via "mot de passe oublié"
    if (!localClient) {
      console.log('🔍 Client non trouvé dans la base locale, vérification dans Odoo...')
      const odooResult = await verifyClientCredentials(email, '') // Vérifier seulement l'existence, pas le mot de passe
      
      // Si le client existe dans Odoo mais pas dans la base locale, on doit créer le compte local
      // mais il doit d'abord définir un mot de passe via "mot de passe oublié"
      if (odooResult.success && odooResult.client) {
        console.log('✅ Client trouvé dans Odoo mais pas de compte local avec mot de passe')
        
        // Créer le compte local sans mot de passe (il devra le définir via "mot de passe oublié")
        try {
          const databaseUrl = process.env.DATABASE_URL
          if (databaseUrl && !databaseUrl.startsWith('file:')) {
            const odooClient = odooResult.client
            await prisma.client.upsert({
              where: { email },
              update: {
                odooId: odooClient.id,
                name: odooClient.name,
                company: odooClient.company || null,
                phone: odooClient.phone || null,
                street: odooClient.street || null,
                city: odooClient.city || null,
                zip: odooClient.zip || null,
                country: odooClient.country || null,
                status: 'approved', // Les clients Odoo sont automatiquement approuvés
                // Ne pas définir de mot de passe - l'utilisateur devra le faire via "mot de passe oublié"
              },
              create: {
                email: odooClient.email,
                odooId: odooClient.id,
                name: odooClient.name,
                company: odooClient.company || null,
                phone: odooClient.phone || null,
                street: odooClient.street || null,
                city: odooClient.city || null,
                zip: odooClient.zip || null,
                country: odooClient.country || null,
                status: 'approved', // Les clients Odoo sont automatiquement approuvés
                // Ne pas définir de mot de passe - l'utilisateur devra le faire via "mot de passe oublié"
              },
            })
          }
        } catch (syncError) {
          console.warn('⚠️  Erreur lors de la création du compte local:', syncError)
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'no_password',
            message: 'Vous devez définir un mot de passe pour votre compte. Utilisez "Mot de passe oublié" pour créer votre mot de passe.' 
          },
          { status: 403 }
        )
      }
    }
    
    // Si aucun compte trouvé ni dans la base locale ni dans Odoo
    console.error('❌ Aucun compte trouvé pour:', email)
    
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

