import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientFromSession } from '@/lib/odoo-auth'
import { toPrismaJson, fromPrismaJson } from '@/lib/prisma-json'

export const dynamic = 'force-dynamic'

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
      quoteId, // ID optionnel pour forcer la mise à jour d'un devis spécifique
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
    let existingQuote = null
    // Vérifier que quoteId est une chaîne non vide et valide
    if (quoteId && typeof quoteId === 'string' && quoteId.trim() !== '') {
      // Si un ID est fourni (et n'est pas null explicitement), chercher ce devis spécifique
      console.log(`🔍 Recherche du devis existant avec ID: ${quoteId}`)
      existingQuote = await prisma.quote.findFirst({
        where: {
          id: quoteId,
          clientId: dbClient.id, // Vérifier que le devis appartient au client
        },
      })
      
      if (existingQuote) {
        console.log(`✅ Devis trouvé: ${existingQuote.id} - Titre: "${existingQuote.title}"`)
      } else {
        console.warn(`⚠️  Devis avec ID ${quoteId} non trouvé ou n'appartient pas au client ${dbClient.id}`)
      }
    } else {
      console.log(`🆕 Aucun ID de devis fourni (quoteId: ${quoteId}), création d'un nouveau devis`)
    }
    // Si quoteId est null explicitement, undefined, ou chaîne vide, créer un nouveau devis

    // Validation des données avec valeurs par défaut
    const safeDelay = delay || { type: 'standard', workingDays: 10 }
    const safeDelivery = delivery || { type: 'pickup' }

    const baseQuoteData = {
      title: title || null,
      status: 'draft',
      step: currentStep || 'title',
      clientName: clientInfo?.name || client.name,
      clientEmail: clientInfo?.email || client.email,
      clientCompany: clientInfo?.company || client.company,
      clientPhone: clientInfo?.phone || client.phone,
      deliveryType: safeDelivery.type || 'pickup',
      deliveryAddress: toPrismaJson(safeDelivery.address),
      billingAddressDifferent: safeDelivery.billingAddressDifferent || false,
      billingAddress: toPrismaJson(safeDelivery.billingAddress),
      individualPackaging: safeDelivery.individualPackaging || false,
      newCarton: safeDelivery.newCarton || false,
      delayWorkingDays: safeDelay.workingDays || 10,
      delayType: safeDelay.type || 'standard',
      delayExpressDays: safeDelay.expressDays || null,
      selectedProducts: toPrismaJson(selectedProducts || []),
      markings: toPrismaJson(currentMarkings || []),
      quoteItems: toPrismaJson(quoteItems || []),
      totalHT: totalHT,
    }

    let quote
    if (existingQuote) {
      // Mettre à jour le devis existant
      console.log(`🔄 Mise à jour du devis existant: ${existingQuote.id}`)
      quote = await prisma.quote.update({
        where: { id: existingQuote.id },
        data: baseQuoteData,
      })
      const selectedProducts = fromPrismaJson(quote.selectedProducts)
      const selectedProductsCount = Array.isArray(selectedProducts) ? selectedProducts.length : 0
      console.log(`✅ Devis mis à jour: ${quote.id} - Titre: "${quote.title}" - Statut: ${quote.status} - Étape: ${quote.step} - Produits: ${selectedProductsCount}`)
    } else {
      // Créer un nouveau devis
      console.log(`🆕 Création d'un nouveau devis pour le client ${dbClient.id}`)
      quote = await prisma.quote.create({
        data: {
          ...baseQuoteData,
          client: {
            connect: { id: dbClient.id }
          }
        },
      })
      const selectedProducts = fromPrismaJson(quote.selectedProducts)
      const selectedProductsCount = Array.isArray(selectedProducts) ? selectedProducts.length : 0
      console.log(`✅ Nouveau devis créé: ${quote.id} - Titre: "${quote.title}" - Statut: ${quote.status} - Étape: ${quote.step} - Produits: ${selectedProductsCount}`)
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
    console.error('❌ Erreur lors de la sauvegarde du devis:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error('❌ Détails de l\'erreur:', errorDetails)
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage || 'Erreur lors de la sauvegarde du devis',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}

