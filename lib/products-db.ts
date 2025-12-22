import { Product, ProductCategory } from '@/types'
import { getProductsFromOdoo } from './odoo-products'
import { prisma } from '@/lib/prisma'

/**
 * Convertit un Product en données pour ProductCache
 */
function productToCacheData(product: Product) {
  return {
    odooId: parseInt(product.id),
    name: product.name,
    defaultCode: product.defaultCode || null,
    supplierReference: product.supplierReference || null,
    description: product.description || null,
    basePrice: product.basePrice || 0,
    category: product.category || null,
    availableColors: JSON.stringify(product.availableColors || []),
    availableSizes: JSON.stringify(product.availableSizes || []),
    variantPrices: product.variantPrices ? JSON.stringify(product.variantPrices) : null,
  }
}

/**
 * Convertit un ProductCache en Product
 */
function cacheDataToProduct(cache: any): Product {
  return {
    id: cache.odooId.toString(),
    name: cache.name,
    defaultCode: cache.defaultCode || undefined,
    supplierReference: cache.supplierReference || undefined,
    description: cache.description || undefined,
    category: cache.category as ProductCategory | undefined,
    basePrice: cache.basePrice,
    availableSizes: JSON.parse(cache.availableSizes || '[]'),
    availableColors: JSON.parse(cache.availableColors || '[]'),
    variantPrices: cache.variantPrices ? JSON.parse(cache.variantPrices) : undefined,
  }
}

/**
 * Synchronise les produits depuis Odoo vers la base de données
 * @param forceRefresh - Force la synchronisation même si les produits sont récents
 */
export async function syncProductsFromOdoo(forceRefresh: boolean = false, limit?: number): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Synchronisation des produits depuis Odoo...', { forceRefresh, limit })
    
    // Récupérer les produits depuis Odoo avec la limite directement dans la requête
    const products = await getProductsFromOdoo(forceRefresh, limit)
    
    if (products.length === 0) {
      console.warn('⚠️  Aucun produit récupéré depuis Odoo')
      return { success: false, count: 0, error: 'Aucun produit récupéré depuis Odoo' }
    }
    
    console.log(`📦 ${products.length} produit(s) récupéré(s) depuis Odoo${limit ? ` (limite: ${limit})` : ''}`)
    
    // Synchroniser chaque produit
    let syncedCount = 0
    let updatedCount = 0
    let createdCount = 0
    let errorCount = 0
    
    for (const product of products) {
      try {
        const cacheData = productToCacheData(product)
        const odooId = parseInt(product.id)
        
        if (isNaN(odooId)) {
          console.warn(`⚠️  ID produit invalide: ${product.id} pour ${product.name}`)
          errorCount++
          continue
        }
        
        
        // Vérifier si le produit existe déjà
        const existing = await prisma.productCache.findUnique({
          where: { odooId },
        })
        
        if (existing) {
          // Mettre à jour le produit existant
          await prisma.productCache.update({
            where: { odooId },
            data: {
              ...cacheData,
              lastSync: new Date(),
            },
          })
          updatedCount++
        } else {
          // Créer un nouveau produit
          await prisma.productCache.create({
            data: {
              ...cacheData,
              lastSync: new Date(),
            },
          })
          createdCount++
        }
        syncedCount++
      } catch (error) {
        errorCount++
        console.error(`⚠️  Erreur lors de la synchronisation du produit ${product.id} (${product.name}):`, error)
        if (error instanceof Error) {
          console.error(`   Détails: ${error.message}`)
          console.error(`   Stack: ${error.stack}`)
        }
        // Continuer avec les autres produits même en cas d'erreur
      }
    }
    
    console.log(`✅ Synchronisation terminée: ${createdCount} créé(s), ${updatedCount} mis à jour, ${errorCount} erreur(s), ${syncedCount} total`)
    
    if (syncedCount === 0 && errorCount > 0) {
      return { success: false, count: 0, error: `Erreur lors de la synchronisation de ${errorCount} produit(s)` }
    }
    
    return { success: true, count: syncedCount }
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des produits:', error)
    return { success: false, count: 0, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

/**
 * Récupère tous les produits depuis la base de données
 */
export async function getProductsFromDB(): Promise<Product[]> {
  try {
    const cachedProducts = await prisma.productCache.findMany({
      orderBy: { name: 'asc' },
    })
    
    console.log(`📦 Récupération depuis la DB: ${cachedProducts.length} produit(s) trouvé(s)`)
    
    if (cachedProducts.length > 0) {
      console.log(`   Exemple de produit:`, {
        odooId: cachedProducts[0].odooId,
        name: cachedProducts[0].name,
        defaultCode: cachedProducts[0].defaultCode,
        supplierReference: cachedProducts[0].supplierReference,
        availableSizes: cachedProducts[0].availableSizes,
        availableColors: cachedProducts[0].availableColors,
      })
    }
    
    const convertedProducts: Product[] = []
    let errorCount = 0
    
    for (const cache of cachedProducts) {
      try {
        const product = cacheDataToProduct(cache)
        convertedProducts.push(product)
      } catch (error) {
        errorCount++
        console.error(`⚠️  Erreur lors de la conversion du produit ${cache.odooId} (${cache.name}):`, error)
        if (error instanceof Error) {
          console.error(`   Détails: ${error.message}`)
        }
      }
    }
    
    console.log(`✅ ${convertedProducts.length} produit(s) converti(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`)
    
    return convertedProducts
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des produits depuis la DB:', error)
    if (error instanceof Error) {
      console.error(`   Détails: ${error.message}`)
      console.error(`   Stack: ${error.stack}`)
    }
    return []
  }
}

/**
 * Vérifie si les produits doivent être synchronisés (dernière sync > 24h)
 */
export async function shouldSyncProducts(): Promise<boolean> {
  try {
    const oldestProduct = await prisma.productCache.findFirst({
      orderBy: { lastSync: 'asc' },
    })
    
    if (!oldestProduct) {
      return true // Pas de produits, il faut synchroniser
    }
    
    const now = new Date()
    const lastSync = oldestProduct.lastSync
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
    
    return hoursSinceSync >= 24 // Synchroniser si > 24h
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la synchronisation:', error)
    return true // En cas d'erreur, synchroniser
  }
}

/**
 * Recherche des produits dans la base de données
 */
export async function searchProductsInDB(query: string): Promise<Product[]> {
  try {
    const searchTerm = query.toLowerCase().trim()
    
    const products = await prisma.productCache.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { defaultCode: { contains: searchTerm, mode: 'insensitive' } },
          { supplierReference: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
    })
    
    return products.map(cacheDataToProduct)
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de produits:', error)
    return []
  }
}

