import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientFromSession } from '@/lib/odoo-auth'

export const dynamic = 'force-dynamic'

/**
 * GET - Récupérer un devis spécifique par son ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params
    const quote = await prisma.quote.findFirst({
      where: {
        id,
        clientId: dbClient.id, // Vérifier que le devis appartient au client
      },
    })

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    // Désérialiser les champs JSON pour SQLite
    const parseJsonField = (field: any) => {
      if (typeof field === 'string') {
        try {
          return JSON.parse(field)
        } catch {
          return field
        }
      }
      return field
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        title: quote.title,
        status: quote.status,
        step: quote.step,
        selectedProducts: parseJsonField(quote.selectedProducts),
        quoteItems: parseJsonField(quote.quoteItems),
        markings: parseJsonField(quote.markings),
        currentMarkings: parseJsonField(quote.markings),
        delivery: {
          type: quote.deliveryType,
          address: parseJsonField(quote.deliveryAddress),
          billingAddress: parseJsonField(quote.billingAddress),
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

/**
 * DELETE - Supprimer un devis spécifique par son ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Récupérer l'ID du devis
    const { id } = await params

    // Vérifier que le devis appartient au client avant de le supprimer
    const quote = await prisma.quote.findFirst({
      where: {
        id,
        clientId: dbClient.id,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le devis
    await prisma.quote.delete({
      where: { id },
    })

    console.log(`✅ Devis supprimé: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Devis supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du devis:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du devis' },
      { status: 500 }
    )
  }
}

