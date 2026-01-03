import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientFromSession } from '@/lib/odoo-auth'
import { fromPrismaJson } from '@/lib/prisma-json'

export const dynamic = 'force-dynamic'

/**
 * GET - Récupérer le devis en cours du client connecté
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

    // Trouver le client dans la DB (ou le créer)
    let dbClient = await prisma.client.findUnique({
      where: { odooId: client.partnerId },
    })

    if (!dbClient) {
      // Créer le client s'il n'existe pas
      dbClient = await prisma.client.create({
        data: {
          odooId: client.partnerId,
          name: client.name,
          email: client.email,
          company: client.company,
          phone: client.phone,
          street: client.street,
          city: client.city,
          zip: client.zip,
          country: client.country,
        },
      })
    }

    // Récupérer le devis en cours (draft) le plus récent qui a un titre
    // Si un devis n'a pas de titre, c'est une ancienne version, on l'ignore
    const quote = await prisma.quote.findFirst({
      where: {
        clientId: dbClient.id,
        status: 'draft',
        title: {
          not: null,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (!quote) {
      return NextResponse.json({ success: true, quote: null })
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        title: quote.title,
        status: quote.status,
        step: quote.step,
        selectedProducts: fromPrismaJson(quote.selectedProducts),
        quoteItems: fromPrismaJson(quote.quoteItems),
        currentMarkings: fromPrismaJson(quote.markings),
        delivery: {
          type: quote.deliveryType,
          address: fromPrismaJson(quote.deliveryAddress),
          billingAddressDifferent: quote.billingAddressDifferent,
          billingAddress: fromPrismaJson(quote.billingAddress),
          individualPackaging: quote.individualPackaging || false,
          newCarton: quote.newCarton || false,
        },
        delay: {
          type: quote.delayType,
          workingDays: quote.delayWorkingDays,
          isExpress: quote.delayType === 'express',
          expressDays: quote.delayExpressDays,
        },
        clientInfo: {
          name: quote.clientName,
          email: quote.clientEmail,
          company: quote.clientCompany,
          phone: quote.clientPhone,
        },
      },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du devis:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du devis' },
      { status: 500 }
    )
  }
}

