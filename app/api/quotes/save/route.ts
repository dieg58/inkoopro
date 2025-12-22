import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientFromSession } from '@/lib/odoo-auth'

/**
 * POST - Sauvegarder le devis en cours
 */
export async function POST(request: NextRequest) {
  try {
    // Récupérer le client depuis la session
    const client = await getClientFromSession()
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      selectedProducts,
      quoteItems,
      currentMarkings,
      currentStep,
      delivery,
      delay,
      clientInfo,
    } = body

    // Trouver ou créer le client dans la DB
    let dbClient = await prisma.client.findUnique({
      where: { odooId: client.partnerId },
    })

    if (!dbClient) {
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

    // Calculer le total HT (simplifié, à améliorer)
    const totalHT = 0 // TODO: Calculer depuis quoteItems

    // Trouver ou créer le devis en cours
    const existingQuote = await prisma.quote.findFirst({
      where: {
        clientId: dbClient.id,
        status: 'draft',
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    const baseQuoteData = {
      title: title || null,
      status: 'draft',
      step: currentStep || 'title',
      clientName: clientInfo?.name || client.name,
      clientEmail: clientInfo?.email || client.email,
      clientCompany: clientInfo?.company || client.company,
      clientPhone: clientInfo?.phone || client.phone,
      deliveryType: delivery?.type || 'livraison',
      deliveryMethod: delivery?.method || null,
      deliveryAddress: delivery?.address || null,
      billingAddressDifferent: delivery?.billingAddressDifferent || false,
      billingAddress: delivery?.billingAddress || null,
      individualPackaging: delivery?.individualPackaging || false,
      newCarton: delivery?.newCarton || false,
      delayWorkingDays: delay?.workingDays || 10,
      delayType: delay?.type || 'standard',
      delayExpressDays: delay?.expressDays || null,
      selectedProducts: selectedProducts || [],
      markings: currentMarkings || [],
      quoteItems: quoteItems || [],
      totalHT: totalHT,
    }

    let quote
    if (existingQuote) {
      // Mettre à jour le devis existant
      quote = await prisma.quote.update({
        where: { id: existingQuote.id },
        data: {
          ...baseQuoteData,
          client: {
            connect: { id: dbClient.id }
          }
        },
      })
      console.log(`✅ Devis mis à jour: ${quote.id} - Titre: ${quote.title} - Statut: ${quote.status}`)
    } else {
      // Créer un nouveau devis
      quote = await prisma.quote.create({
        data: {
          ...baseQuoteData,
          client: {
            connect: { id: dbClient.id }
          }
        },
      })
      console.log(`✅ Nouveau devis créé: ${quote.id} - Titre: ${quote.title} - Statut: ${quote.status}`)
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        status: quote.status,
        step: quote.step,
        title: quote.title,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du devis:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la sauvegarde du devis' },
      { status: 500 }
    )
  }
}

