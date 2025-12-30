import { NextRequest, NextResponse } from 'next/server'
import { getProductsFromDB, syncProductsFromOdoo } from '@/lib/products-db'
import { sampleProducts } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const forceSync = searchParams.get('sync') === 'true'
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Vérifier si Odoo est configuré
    const odooUrl = process.env.NEXT_PUBLIC_ODOO_URL
    const useOdoo = odooUrl && odooUrl !== ''
    
    let products: any[] = []
    let source = 'db'
    
    if (useOdoo) {
      // Synchroniser UNIQUEMENT si explicitement demandé
      if (forceSync || forceRefresh) {
        console.log('🔄 Synchronisation des produits depuis Odoo (demandée manuellement)...')
        const syncResult = await syncProductsFromOdoo(forceRefresh || forceSync)
        
        if (!syncResult.success) {
          console.warn('⚠️  Échec de la synchronisation, utilisation des produits de la DB')
        } else {
          console.log(`✅ ${syncResult.count} produit(s) synchronisé(s)`)
          source = 'db-synced'
        }
      }
      
      // Récupérer les produits depuis la base de données
      products = await getProductsFromDB()
      
      console.log(`📊 Produits récupérés depuis la DB: ${products.length}`)
      
      // Si aucun produit dans la DB, utiliser les produits d'exemple (pas de sync automatique)
      if (products.length === 0) {
        console.warn('⚠️  Aucun produit dans la DB, utilisation des produits d\'exemple')
        console.warn('   → Utilisez /api/products?sync=true pour synchroniser depuis Odoo')
        products = sampleProducts
        source = 'fallback'
      } else {
        console.log(`✅ ${products.length} produit(s) retourné(s) depuis la DB`)
      }
    } else {
      // Utiliser les produits d'exemple si Odoo n'est pas configuré
      console.log('Odoo non configuré, utilisation des produits d\'exemple')
      products = sampleProducts
      source = 'sample'
    }

    const response = NextResponse.json({
      success: true,
      products,
      source, // Indique la source des produits (db, db-synced, fallback, sample)
      count: products.length,
    })
    
    // Ajouter des headers de cache pour les produits (5 minutes)
    // Les produits changent peu souvent, donc on peut mettre en cache
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
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

