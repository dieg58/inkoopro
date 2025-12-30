import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientFromSession } from '@/lib/odoo-auth'

/**
 * GET - Récupérer un devis spécifique par son ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer le client depuis la session
    const client = await getClientFromSession()
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Trouver le client dans la DB
    const dbClient = await prisma.client.findUnique({
      where: { odooId: client.partnerId },
    })

    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer le devis
    const quote = await prisma.quote.findFirst({
      where: {
        id: params.id,
        clientId: dbClient.id, // Vérifier que le devis appartient au client
      },
    })

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        title: quote.title,
        status: quote.status,
        step: quote.step,
        selectedProducts: quote.selectedProducts,
        quoteItems: quote.quoteItems,
        markings: quote.markings,
        currentMarkings: quote.markings,
        delivery: {
          type: quote.deliveryType,
          address: quote.deliveryAddress,
          billingAddress: quote.billingAddress,
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
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
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

