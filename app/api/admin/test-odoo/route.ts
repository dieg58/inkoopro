import { NextRequest, NextResponse } from 'next/server'
import { getProductsFromOdoo } from '@/lib/odoo-products'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // IMPORTANT: Cette route est uniquement pour les tests manuels, jamais pendant le build
  // Si elle est appelée pendant le build, retourner immédiatement sans appeler Odoo
  // On détecte le build en vérifiant si c'est une requête runtime (avec x-vercel-id ou x-now-id) ou build time
  const isRuntimeRequest = request.headers.get('x-vercel-id') || request.headers.get('x-now-id')
  const isBuildTime = !isRuntimeRequest && (process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI)
  
  if (isBuildTime) {
    // Pendant le build, retourner immédiatement sans appeler Odoo
    return NextResponse.json({
      success: false,
      error: 'Cette route de test ne peut pas être utilisée pendant le build',
      note: 'Utilisez /api/products/sync pour synchroniser les produits depuis l\'interface admin',
    }, { status: 503 })
  }

  try {
    console.log('Test de connexion Odoo...')
    console.log('ODOO_URL:', process.env.NEXT_PUBLIC_ODOO_URL ? 'Configuré' : 'Non configuré')
    console.log('ODOO_DB:', process.env.NEXT_PUBLIC_ODOO_DB ? 'Configuré' : 'Non configuré')
    console.log('ODOO_USERNAME:', process.env.NEXT_PUBLIC_ODOO_USERNAME ? 'Configuré' : 'Non configuré')
    console.log('ODOO_API_KEY:', process.env.ODOO_API_KEY ? 'Configuré' : 'Non configuré')

    const products = await getProductsFromOdoo()

    return NextResponse.json({
      success: true,
      productCount: products.length,
      products: products.slice(0, 5), // Retourner les 5 premiers pour le test
      message: products.length > 0 
        ? `${products.length} produit(s) trouvé(s)`
        : 'Aucun produit trouvé. Vérifiez les logs du serveur pour plus de détails.',
    })
  } catch (error) {
    console.error('Erreur test Odoo:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 })
  }
}

