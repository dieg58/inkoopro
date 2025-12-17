import { NextRequest, NextResponse } from 'next/server'
import { getProductsFromOdoo } from '@/lib/odoo-products'
import { sampleProducts } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    // Vérifier si Odoo est configuré
    const odooUrl = process.env.NEXT_PUBLIC_ODOO_URL
    const useOdoo = odooUrl && odooUrl !== ''
    
    let products: any[] = []
    let source = 'odoo'
    
    if (useOdoo) {
      // Vérifier si on doit forcer le refresh (paramètre ?refresh=true)
      const searchParams = request.nextUrl.searchParams
      const forceRefresh = searchParams.get('refresh') === 'true'
      
      // Essayer de récupérer depuis Odoo (avec ou sans cache selon forceRefresh)
      products = await getProductsFromOdoo(forceRefresh)
      
      // Si aucun produit n'est retourné, utiliser les produits d'exemple
      if (products.length === 0) {
        console.warn('Aucun produit récupéré depuis Odoo, utilisation des produits d\'exemple')
        products = sampleProducts
        source = 'fallback'
      }
    } else {
      // Utiliser les produits d'exemple si Odoo n'est pas configuré
      console.log('Odoo non configuré, utilisation des produits d\'exemple')
      products = sampleProducts
      source = 'sample'
    }

    return NextResponse.json({
      success: true,
      products,
      source, // Indique la source des produits (odoo, fallback, sample)
      count: products.length,
    })
  } catch (error) {
    console.error('Erreur API products:', error)
    // En cas d'erreur, retourner les produits d'exemple
    return NextResponse.json({
      success: true,
      products: sampleProducts,
      source: 'error-fallback',
      count: sampleProducts.length,
    })
  }
}

