import { NextRequest, NextResponse } from 'next/server'
import { verifyClientCredentials, setClientSession } from '@/lib/odoo-auth'

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

    // Vérifier les identifiants avec Odoo
    const result = await verifyClientCredentials(email, password)

    if (result.success && result.client) {
      console.log('✅ Connexion réussie, création de la session')
      // Créer la session
      await setClientSession(result.client)

      return NextResponse.json({
        success: true,
        client: result.client,
      })
    } else {
      console.error('❌ Échec de la connexion:', result.error)
      return NextResponse.json(
        { success: false, error: result.error || 'Identifiants incorrects' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('❌ Erreur API login:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

