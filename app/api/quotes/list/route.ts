import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientFromSession } from '@/lib/odoo-auth'

/**
 * GET - Lister tous les devis du client connecté
 */
export async function GET(request: NextRequest) {
  try {
    // Récupérer le client depuis la session
    const client = await getClientFromSession()
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Trouver le client dans la DB (sans sélectionner defaultDeliveryMethod si la colonne n'existe pas)
    const dbClient = await prisma.client.findUnique({
      where: { odooId: client.partnerId },
      select: {
        id: true,
        odooId: true,
        name: true,
        email: true,
        // Ne pas sélectionner defaultDeliveryMethod si la colonne n'existe pas encore
      },
    })

    if (!dbClient) {
      return NextResponse.json({
        success: true,
        quotes: [],
      })
    }

    // Récupérer tous les devis du client (drafts et validés), triés par date de mise à jour (plus récent en premier)
    const quotes = await prisma.quote.findMany({
      where: {
        clientId: dbClient.id,
        // Inclure tous les devis, qu'ils soient draft ou validés
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        status: true,
        step: true,
        createdAt: true,
        updatedAt: true,
        submittedAt: true,
        odooOrderId: true,
      },
    })

    console.log(`📋 Devis trouvés pour le client ${dbClient.id}:`, quotes.length)
    quotes.forEach(q => {
      console.log(`  - ${q.id}: "${q.title}" (${q.status}) - Étape: ${q.step}`)
    })

    return NextResponse.json({
      success: true,
      quotes: quotes.map(quote => ({
        id: quote.id,
        title: quote.title || 'Devis sans titre',
        status: quote.status,
        step: quote.step,
        createdAt: quote.createdAt.toISOString(),
        updatedAt: quote.updatedAt.toISOString(),
        submittedAt: quote.submittedAt?.toISOString() || null,
        odooOrderId: quote.odooOrderId,
      })),
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des devis:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des devis' },
      { status: 500 }
    )
  }
}

