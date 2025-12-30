import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientFromSession } from '@/lib/odoo-auth'

export const dynamic = 'force-dynamic'

/**
 * GET - Récupérer les paramètres du client
 */
export async function GET(request: NextRequest) {
  try {
    const client = await getClientFromSession()
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

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

    return NextResponse.json({
      success: true,
      settings: {
        defaultDeliveryMethod: dbClient.defaultDeliveryMethod,
        defaultDeliveryAddress: dbClient.defaultDeliveryAddress as {
          street: string
          city: string
          postalCode: string
          country: string
        } | null,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Mettre à jour les paramètres du client
 */
export async function PUT(request: NextRequest) {
  try {
    const client = await getClientFromSession()
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { defaultDeliveryMethod, defaultDeliveryAddress } = body

    // Normaliser la valeur : convertir chaîne vide ou "none" en null
    const normalizedMethod = !defaultDeliveryMethod || defaultDeliveryMethod === '' || defaultDeliveryMethod === 'none' 
      ? null 
      : defaultDeliveryMethod

    // Normaliser l'adresse de livraison : null si non fournie ou vide
    const normalizedAddress = defaultDeliveryAddress && 
      defaultDeliveryAddress.street && 
      defaultDeliveryAddress.city && 
      defaultDeliveryAddress.postalCode
      ? defaultDeliveryAddress
      : null

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
          defaultDeliveryMethod: normalizedMethod,
          defaultDeliveryAddress: normalizedAddress,
        },
      })
    } else {
      // Mettre à jour le client
      dbClient = await prisma.client.update({
        where: { id: dbClient.id },
        data: {
          defaultDeliveryMethod: normalizedMethod,
          defaultDeliveryAddress: normalizedAddress,
        },
      })
    }

    return NextResponse.json({
      success: true,
      settings: {
        defaultDeliveryMethod: dbClient.defaultDeliveryMethod,
        defaultDeliveryAddress: dbClient.defaultDeliveryAddress as {
          street: string
          city: string
          postalCode: string
          country: string
        } | null,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { success: false, error: `Erreur lors de la mise à jour des paramètres: ${errorMessage}` },
      { status: 500 }
    )
  }
}

