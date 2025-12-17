import { NextRequest, NextResponse } from 'next/server'
import { Quote } from '@/types'
import { createQuoteInOdoo } from '@/lib/odoo'
import { getClientFromSession } from '@/lib/odoo-auth'

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Réception d\'une demande de création de devis')
    
    // Vérifier l'authentification du client
    const client = await getClientFromSession()
    if (!client) {
      console.error('❌ Client non authentifié')
      return NextResponse.json(
        { success: false, error: 'Non authentifié. Veuillez vous connecter.' },
        { status: 401 }
      )
    }

    console.log('✅ Client authentifié:', client.name, '(Partner ID:', client.partnerId, ')')

    const quote: Quote = await request.json()
    console.log('📋 Devis reçu:', {
      items_count: quote.items?.length || 0,
      has_delivery: !!quote.delivery,
      has_delay: !!quote.delay,
      has_clientInfo: !!quote.clientInfo,
    })

    // Validation basique
    if (!quote.items || quote.items.length === 0) {
      console.error('❌ Aucun article dans le devis')
      return NextResponse.json(
        { success: false, error: 'Le devis doit contenir au moins un article' },
        { status: 400 }
      )
    }

    if (!quote.delivery) {
      console.error('❌ Informations de livraison manquantes')
      return NextResponse.json(
        { success: false, error: 'Les informations de livraison sont requises' },
        { status: 400 }
      )
    }

    if (!quote.delay) {
      console.error('❌ Délai manquant')
      return NextResponse.json(
        { success: false, error: 'Le délai est requis' },
        { status: 400 }
      )
    }

    // Envoyer à Odoo avec le partner_id du client connecté
    console.log('📤 Envoi du devis à Odoo...')
    const result = await createQuoteInOdoo(quote, client.partnerId)

    if (result.success) {
      console.log('✅ Devis créé avec succès, ID:', result.quoteId)
      return NextResponse.json({
        success: true,
        quoteId: result.quoteId,
        message: 'Devis créé avec succès dans Odoo',
      })
    } else {
      console.error('❌ Échec de la création du devis:', result.error)
      return NextResponse.json(
        { success: false, error: result.error || 'Erreur lors de la création du devis' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Erreur API quote:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

