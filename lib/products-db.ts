import { Product, ProductCategory } from '@/types'
import { getProductsFromOdoo } from './odoo-products'
import { prisma } from '@/lib/prisma'
import { isSQLite } from './prisma-json'

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
 * @param limit - Nombre maximum de produits à synchroniser dans ce lot
 * @param offset - Offset pour la pagination (produits déjà synchronisés)
 */
export async function syncProductsFromOdoo(forceRefresh: boolean = false, limit?: number, offset: number = 0): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Synchronisation des produits depuis Odoo...', { forceRefresh, limit, offset })
    
    // Toujours forcer le refresh pour ignorer le cache fichier (non persistant sur Vercel)
    // La DB est la source de vérité persistante
    // Note: getProductsFromOdoo gère déjà la pagination, mais on doit limiter le nombre total
    const products = await getProductsFromOdoo(true, limit ? limit + offset : undefined)
    
    // Appliquer l'offset pour ne traiter que les produits de ce lot
    const productsToSync = offset > 0 ? products.slice(offset) : products
    const limitedProducts = limit ? productsToSync.slice(0, limit) : productsToSync
    
    if (limitedProducts.length === 0) {
      console.warn('⚠️  Aucun produit à synchroniser dans ce lot')
      return { success: true, count: 0 } // Pas d'erreur, juste rien à synchroniser
    }
    
    console.log(`📦 ${limitedProducts.length} produit(s) à synchroniser dans ce lot (${products.length} total récupéré(s) depuis Odoo)`)
    
    // Synchroniser les produits par lots pour améliorer les performances
    const BATCH_SIZE = 100 // Traiter 100 produits à la fois
    let syncedCount = 0
    let skippedCount = 0 // Produits déjà existants (ignorés)
    let createdCount = 0
    let errorCount = 0
    
    // Récupérer tous les IDs existants en une seule requête pour optimiser
    const existingProducts = await prisma.productCache.findMany({
      select: { odooId: true },
    })
    const existingIds = new Set(existingProducts.map(p => p.odooId))
    
    console.log(`📊 ${existingIds.size} produit(s) déjà en base de données`)
    
    // Traiter par lots
    const totalBatches = Math.ceil(limitedProducts.length / BATCH_SIZE)
    for (let i = 0; i < limitedProducts.length; i += BATCH_SIZE) {
      const batch = limitedProducts.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      
      console.log(`📦 Traitement du lot ${batchNumber}/${totalBatches} (${batch.length} produits)...`)
      
      // Préparer les données pour ce lot
      const toCreate: any[] = []
      
      for (const product of batch) {
        try {
          const cacheData = productToCacheData(product)
          const odooId = parseInt(product.id)
          
          if (isNaN(odooId)) {
            console.warn(`⚠️  ID produit invalide: ${product.id} pour ${product.name}`)
            errorCount++
            continue
          }
          
          const now = new Date()
          if (existingIds.has(odooId)) {
            // Produit déjà existant : passer au suivant sans mettre à jour
            skippedCount++
            continue
          } else {
            // Créer
            toCreate.push({
              ...cacheData,
              lastSync: now,
            })
            existingIds.add(odooId) // Ajouter à l'ensemble pour éviter les doublons dans le même lot
          }
        } catch (error) {
          errorCount++
          console.error(`⚠️  Erreur lors de la préparation du produit ${product.id}:`, error)
        }
      }
      
      // Exécuter les créations par lots
      if (toCreate.length > 0) {
        try {
          // Utiliser createMany pour créer plusieurs produits en une seule transaction
          // SQLite ne supporte pas skipDuplicates, on doit filtrer manuellement
          // PostgreSQL supporte skipDuplicates
          if (isSQLite()) {
            // Pour SQLite, créer un par un avec gestion d'erreur
            for (const product of toCreate) {
              try {
                await prisma.productCache.create({ data: product })
              } catch (error: any) {
                // Ignorer les erreurs de doublon (code P2002)
                if (error.code !== 'P2002') {
                  throw error
                }
              }
            }
          } else {
            // Pour PostgreSQL, utiliser createMany avec skipDuplicates
            // Type assertion nécessaire car TypeScript ne détecte pas le support PostgreSQL
            await (prisma.productCache.createMany as any)({
              data: toCreate,
              skipDuplicates: true,
            })
          }
          createdCount += toCreate.length
          console.log(`   ✅ ${toCreate.length} produit(s) créé(s)`)
        } catch (error) {
          console.error(`   ❌ Erreur lors de la création du lot:`, error)
          errorCount += toCreate.length
        }
      }
      
      // Les produits existants sont maintenant ignorés (passage au suivant)
      // Plus besoin de mettre à jour les produits existants
      
      syncedCount += toCreate.length
    }
    
    console.log(`✅ Synchronisation terminée: ${createdCount} créé(s), ${skippedCount} ignoré(s) (déjà existants), ${errorCount} erreur(s), ${syncedCount} total`)
    
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
          { name: { contains: searchTerm } },
          { defaultCode: { contains: searchTerm } },
          { supplierReference: { contains: searchTerm } },
          { description: { contains: searchTerm } },
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

