import { NextRequest, NextResponse } from 'next/server'
import { getProductsFromOdoo } from '@/lib/odoo-products'

export async function GET(request: NextRequest) {
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

