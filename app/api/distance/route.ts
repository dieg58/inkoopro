import { NextRequest, NextResponse } from 'next/server'
import { calculateDistanceToWarehouse } from '@/lib/distance'

/**
 * POST - Calcule la distance entre l'adresse de livraison et l'entrepôt
 */
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()
    
    if (!address || !address.street || !address.city || !address.postalCode) {
      return NextResponse.json(
        { success: false, error: 'Adresse incomplète' },
        { status: 400 }
      )
    }
    
    const result = await calculateDistanceToWarehouse(address)
    
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error, distance: result.distance },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      distance: result.distance, // Distance en km
    })
  } catch (error) {
    console.error('Erreur API distance:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du calcul de la distance' },
      { status: 500 }
    )
  }
}

