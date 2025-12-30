import { Product, ProductSize, ProductCategory } from '@/types'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Configuration Odoo pour les produits
 */
const ODOO_URL = process.env.NEXT_PUBLIC_ODOO_URL || ''
const ODOO_DB = process.env.NEXT_PUBLIC_ODOO_DB || ''
const ODOO_USERNAME = process.env.NEXT_PUBLIC_ODOO_USERNAME || ''
const ODOO_PASSWORD = process.env.NEXT_PUBLIC_ODOO_PASSWORD || ''
const ODOO_API_KEY = process.env.ODOO_API_KEY || '' // Clé API optionnelle

/**
 * Authentification Odoo et récupération de l'UID et session_id
 * Pour Odoo, on doit utiliser l'authentification dans chaque requête ou utiliser XML-RPC
 * Supporte la clé API (recommandé) ou username/password
 */
async function authenticateOdoo(): Promise<{ uid: number; sessionId: string; password?: string } | null> {
  try {
    // Vérifier que l'URL Odoo est configurée
    if (!ODOO_URL || ODOO_URL === '') {
      console.warn('⚠️  NEXT_PUBLIC_ODOO_URL n\'est pas configuré')
      return null
    }

    // Méthode 1: Authentification par clé API (si disponible)
    if (ODOO_API_KEY && ODOO_API_KEY !== '') {
      console.log('🔑 Tentative d\'authentification avec clé API...')
      try {
        // Avec clé API, on doit utiliser l'endpoint /xmlrpc/2/common pour obtenir l'UID
        // ou utiliser l'endpoint /jsonrpc avec la clé API dans les headers
        // Note: L'authentification par clé API dans Odoo peut varier selon la version
        // Pour l'instant, on utilise la méthode standard avec username/password
        // Si vous avez une clé API, vous devez avoir un utilisateur associé
        // On essaie d'abord avec username/password si disponibles
        if (ODOO_USERNAME && ODOO_PASSWORD) {
          const response = await fetch(`${ODOO_URL}/web/session/authenticate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'call',
              params: {
                db: ODOO_DB,
                login: ODOO_USERNAME,
                password: auth.password,
              },
            }),
          })

          const data = await response.json()
          if (data.result && data.result.uid) {
            console.log('✅ Authentification réussie avec username/password (clé API configurée mais utilisant username/password)')
            return {
              uid: data.result.uid,
              sessionId: data.result.session_id || '',
              password: auth.password,
            }
          }
        }
        // Si username/password ne fonctionne pas, on retourne null
        // (L'utilisation de la clé API nécessiterait une implémentation spécifique selon votre version d'Odoo)
        console.warn('⚠️  Clé API configurée mais username/password requis pour l\'authentification')
        return null
      } catch (apiError) {
        console.error('❌ Erreur lors de l\'authentification avec clé API:', apiError)
        return null
      }
    }

    // Méthode 2: Authentification par username/password (fallback ou si pas de clé API)
    if (!ODOO_USERNAME || !ODOO_PASSWORD) {
      console.error('❌ NEXT_PUBLIC_ODOO_USERNAME et NEXT_PUBLIC_ODOO_PASSWORD requis pour l\'authentification')
      return null
    }

    const response = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: ODOO_DB,
          login: ODOO_USERNAME,
          password: auth.password,
        },
      }),
    })

    const data = await response.json()
    if (data.result && data.result.uid) {
      return {
        uid: data.result.uid,
        sessionId: data.result.session_id || '',
        password: auth.password,
      }
    }
    return null
  } catch (error) {
    console.error('Erreur d\'authentification Odoo:', error)
    return null
  }
}

/**
 * Chemin du fichier de cache
 */
const CACHE_FILE_PATH = path.join(process.cwd(), '.cache', 'odoo-products.json')
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 heures

/**
 * Interface pour le cache
 */
interface ProductsCache {
  products: Product[]
  lastUpdate: number // Timestamp en millisecondes
}

/**
 * Charge les produits depuis le cache si valide
 */
async function loadFromCache(): Promise<Product[] | null> {
  try {
    const cacheData = await fs.readFile(CACHE_FILE_PATH, 'utf-8')
    const cache: ProductsCache = JSON.parse(cacheData)
    
    const now = Date.now()
    const cacheAge = now - cache.lastUpdate
    
    // Vérifier si le cache est encore valide (moins de 24h)
    if (cacheAge < CACHE_DURATION_MS) {
      console.log(`✅ Cache valide (${Math.round(cacheAge / 1000 / 60)} minutes) - ${cache.products.length} produits`)
      return cache.products
    } else {
      console.log(`⏰ Cache expiré (${Math.round(cacheAge / 1000 / 60 / 60)} heures) - Mise à jour nécessaire`)
      return null
    }
  } catch (error) {
    // Le fichier de cache n'existe pas ou est invalide
    console.log('ℹ️  Aucun cache trouvé, récupération depuis Odoo...')
    return null
  }
}

/**
 * Sauvegarde les produits dans le cache
 */
async function saveToCache(products: Product[]): Promise<void> {
  try {
    // Créer le dossier .cache s'il n'existe pas
    const cacheDir = path.dirname(CACHE_FILE_PATH)
    await fs.mkdir(cacheDir, { recursive: true })
    
    const cache: ProductsCache = {
      products,
      lastUpdate: Date.now(),
    }
    
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8')
    console.log(`💾 Cache sauvegardé: ${products.length} produits`)
  } catch (error) {
    console.error('⚠️  Erreur lors de la sauvegarde du cache:', error)
    // Ne pas bloquer si le cache ne peut pas être sauvegardé
  }
}

/**
 * Récupère les produits depuis Odoo
 * Utilise un cache quotidien pour éviter de recharger à chaque fois
 * @param forceRefresh - Force la mise à jour même si le cache est valide
 */
export async function getProductsFromOdoo(forceRefresh: boolean = false, limit?: number): Promise<Product[]> {
  // Vérifier le cache si on ne force pas le refresh
  if (!forceRefresh) {
    const cachedProducts = await loadFromCache()
    if (cachedProducts) {
      return cachedProducts
    }
  } else {
    console.log('🔄 Refresh forcé - Ignorer le cache')
  }

  try {
    // Log des variables d'environnement (masquer les mots de passe)
    console.log('🔍 Configuration Odoo:', {
      url: ODOO_URL || '❌ Non configuré',
      db: ODOO_DB || '❌ Non configuré',
      user: ODOO_USERNAME || '❌ Non configuré',
      hasPassword: !!auth.password,
      hasApiKey: !!ODOO_API_KEY,
    })
    
    // Authentification
    const auth = await authenticateOdoo()
    if (!auth || !auth.uid) {
      console.error('❌ Échec de l\'authentification Odoo')
      console.error('   → Vérifiez vos identifiants dans .env.local')
      console.error('   → Vérifiez que l\'URL Odoo est accessible')
      return []
    }
    
    console.log('✅ Authentification Odoo réussie, UID:', auth.uid, 'Session:', auth.sessionId ? 'OK' : 'N/A')

    // Vérifier que le password est disponible
    if (!auth.password) {
      console.error('❌ Mot de passe non disponible dans l\'authentification')
      return []
    }

    // D'abord, récupérer toutes les catégories ecommerce qui contiennent "textile" ou "t-shirt"
    console.log('🔍 Recherche des catégories ecommerce "textile" et sous-catégories...')
    const textileCategoryRequest = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          auth.uid,
          auth.password,
          'product.public.category',
          'search_read',
          [
            [
              '|',
              ['name', 'ilike', 'textile'],
              ['name', 'ilike', 't-shirt'],
            ],
          ],
          {
            fields: ['id', 'name', 'parent_id'],
            limit: 50, // Augmenter la limite pour inclure toutes les sous-catégories
          },
        ],
      },
    }

    const textileCategoryResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(textileCategoryRequest),
      signal: AbortSignal.timeout(30000),
    })

    const textileCategoryData = await textileCategoryResponse.json()
    const textileCategories = textileCategoryData.result || []
    
    // Trouver la catégorie parent "textile" et collecter toutes les sous-catégories
    let textilePublicCategoryId: number | null = null
    const textilePublicCategoryIds: number[] = [] // Toutes les catégories textile (parent + enfants)
    
    // D'abord, trouver la catégorie parent "textile"
    for (const cat of textileCategories) {
      if (cat.name.toLowerCase() === 'textile' && (!cat.parent_id || cat.parent_id.length === 0)) {
        textilePublicCategoryId = cat.id
        textilePublicCategoryIds.push(cat.id)
        console.log(`✅ Catégorie ecommerce parent "textile" trouvée (ID: ${textilePublicCategoryId})`)
        break
      }
    }
    
    // Si pas trouvée exactement, prendre la première qui contient "textile"
    if (!textilePublicCategoryId && textileCategories.length > 0) {
      // Chercher une catégorie sans parent qui contient "textile"
      const parentCategory = textileCategories.find((cat: any) => 
        cat.name.toLowerCase().includes('textile') && (!cat.parent_id || cat.parent_id.length === 0)
      )
      if (parentCategory) {
        textilePublicCategoryId = parentCategory.id
        textilePublicCategoryIds.push(parentCategory.id)
        console.log(`⚠️  Catégorie ecommerce "textile" exacte non trouvée, utilisation de "${parentCategory.name}" (ID: ${textilePublicCategoryId})`)
      }
    }
    
    // Collecter toutes les sous-catégories (y compris "T-Shirts")
    for (const cat of textileCategories) {
      // Si c'est une sous-catégorie de textile ou contient "t-shirt"
      if (cat.id !== textilePublicCategoryId) {
        const isChildOfTextile = cat.parent_id && cat.parent_id[0] === textilePublicCategoryId
        const isTShirt = cat.name.toLowerCase().includes('t-shirt') || cat.name.toLowerCase().includes('tshirt')
        
        if (isChildOfTextile || isTShirt) {
          textilePublicCategoryIds.push(cat.id)
          console.log(`  📁 Sous-catégorie trouvée: "${cat.name}" (ID: ${cat.id})`)
        }
      }
    }
    
    console.log(`📋 Total catégories ecommerce textile trouvées: ${textilePublicCategoryIds.length}`)

    // Aussi chercher la catégorie produit interne "textile" et sous-catégories
    console.log('🔍 Recherche de la catégorie produit interne "textile" et sous-catégories...')
    const productCategoryRequest = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          auth.uid,
          auth.password,
          'product.category',
          'search_read',
          [
            [
              '|',
              ['name', 'ilike', 'textile'],
              ['name', 'ilike', 't-shirt'],
            ],
          ],
          {
            fields: ['id', 'name', 'parent_id'],
            limit: 50, // Augmenter la limite pour inclure toutes les sous-catégories
          },
        ],
      },
    }

    const productCategoryResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productCategoryRequest),
      signal: AbortSignal.timeout(30000),
    })

    const productCategoryData = await productCategoryResponse.json()
    const productCategories = productCategoryData.result || []
    
    // Trouver la catégorie produit "textile" et collecter toutes les sous-catégories
    let textileProductCategoryId: number | null = null
    const textileProductCategoryIds: number[] = [] // Toutes les catégories produit textile (parent + enfants)
    
    // D'abord, trouver la catégorie parent "textile"
    for (const cat of productCategories) {
      if (cat.name.toLowerCase() === 'textile' && (!cat.parent_id || cat.parent_id.length === 0)) {
        textileProductCategoryId = cat.id
        textileProductCategoryIds.push(cat.id)
        console.log(`✅ Catégorie produit parent "textile" trouvée (ID: ${textileProductCategoryId})`)
        break
      }
    }
    
    if (!textileProductCategoryId && productCategories.length > 0) {
      // Chercher une catégorie sans parent qui contient "textile"
      const parentCategory = productCategories.find((cat: any) => 
        cat.name.toLowerCase().includes('textile') && (!cat.parent_id || cat.parent_id.length === 0)
      )
      if (parentCategory) {
        textileProductCategoryId = parentCategory.id
        textileProductCategoryIds.push(parentCategory.id)
        console.log(`⚠️  Catégorie produit "textile" exacte non trouvée, utilisation de "${parentCategory.name}" (ID: ${textileProductCategoryId})`)
      }
    }
    
    // Collecter toutes les sous-catégories (y compris "T-Shirts")
    for (const cat of productCategories) {
      if (cat.id !== textileProductCategoryId) {
        const isChildOfTextile = cat.parent_id && cat.parent_id[0] === textileProductCategoryId
        const isTShirt = cat.name.toLowerCase().includes('t-shirt') || cat.name.toLowerCase().includes('tshirt')
        
        if (isChildOfTextile || isTShirt) {
          textileProductCategoryIds.push(cat.id)
          console.log(`  📁 Sous-catégorie produit trouvée: "${cat.name}" (ID: ${cat.id})`)
        }
      }
    }
    
    console.log(`📋 Total catégories produit textile trouvées: ${textileProductCategoryIds.length}`)

    if (textilePublicCategoryIds.length === 0 && textileProductCategoryIds.length === 0) {
      console.warn('⚠️  Catégorie "textile" non trouvée dans Odoo (ni ecommerce ni produit)')
      console.warn('   → Vérifiez que la catégorie existe dans Odoo')
      console.warn('   → Récupération de tous les produits (pas de filtre)')
    }

    // Construire le filtre pour les produits
    // On cherche les produits qui sont dans une des catégories ecommerce OU une des catégories produit
    const productFilters: any[] = []
    const orConditions: any[] = []
    
    // Ajouter un filtre pour chaque catégorie ecommerce trouvée
    for (const catId of textilePublicCategoryIds) {
      orConditions.push(['public_categ_ids', 'in', [catId]])
    }
    
    // Ajouter un filtre pour chaque catégorie produit trouvée
    for (const catId of textileProductCategoryIds) {
      orConditions.push(['categ_id', '=', catId])
    }
    
    // Si on a trouvé la catégorie parent, utiliser aussi child_of pour inclure toutes les sous-catégories
    if (textilePublicCategoryId) {
      orConditions.push(['public_categ_ids', 'child_of', textilePublicCategoryId])
      console.log(`📋 Filtre ecommerce (child_of): produits dans la catégorie ecommerce "textile" et sous-catégories (ID: ${textilePublicCategoryId})`)
    }
    
    if (textileProductCategoryId) {
      orConditions.push(['categ_id', 'child_of', textileProductCategoryId])
      console.log(`📋 Filtre produit (child_of): produits dans la catégorie produit "textile" et sous-catégories (ID: ${textileProductCategoryId})`)
    }
    
    // Si on a au moins une catégorie, utiliser un filtre OR
    if (orConditions.length > 0) {
      if (orConditions.length === 1) {
        productFilters.push(...orConditions)
      } else {
        // Utiliser '|' (OR) pour combiner les conditions
        // Syntaxe Odoo: ['|', condition1, condition2] pour 2 conditions
        // Pour 3+ conditions: ['|', condition1, '|', condition2, condition3]
        const orFilter: any[] = ['|', orConditions[0]]
        for (let i = 1; i < orConditions.length; i++) {
          if (i < orConditions.length - 1) {
            orFilter.push('|', orConditions[i])
          } else {
            orFilter.push(orConditions[i])
          }
        }
        productFilters.push(...orFilter)
      }
      console.log(`✅ Filtre appliqué: ${orConditions.length} condition(s) de catégorie "textile"`)
    }
    
    // Ajouter des filtres supplémentaires pour les produits actifs et vendables
    // Ces filtres sont combinés avec AND (par défaut dans Odoo quand on les met dans le même tableau)
    productFilters.push(['sale_ok', '=', true])
    productFilters.push(['active', '=', true])
    console.log('📋 Filtres supplémentaires: sale_ok=True, active=True')

    // Récupérer les templates de produits depuis Odoo (product.template = produit avec variantes)
    // Pour Odoo, on doit inclure les identifiants dans chaque requête JSON-RPC
    const requestBody = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          auth.uid,
          auth.password, // Passer le mot de passe dans la requête
          'product.template', // Utiliser product.template pour avoir les variantes
          'search_read',
          [
            productFilters, // Filtrer par catégorie ecommerce "textile"
          ],
          {
            fields: [
              'id', 
              'name', 
              'default_code', // Référence produit (ex: K3025)
              'supplier_ref', // Supplier Reference (ex: CGTW02T)
              'seller_ids', // IDs des fournisseurs (product.supplierinfo)
              'description', 
              'description_sale', 
              'list_price', 
              'categ_id', // Catégorie produit
              'public_categ_ids', // Catégories ecommerce/public
              'product_variant_ids', // IDs des variantes
              'attribute_line_ids', // Attributs (couleurs, tailles)
            ],
            // Limiter le nombre de produits si spécifié
            ...(limit ? { limit } : {}), // Ajouter limit seulement si défini
            order: 'name asc',
          },
        ],
      },
    }
    
    console.log('📤 Requête Odoo (product.template avec variantes):', {
      model: 'product.template',
      method: 'search_read',
      db: ODOO_DB,
      uid: auth.uid,
    })
    
    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    if (data.error) {
      console.error('❌ Erreur lors de la récupération des produits:', data.error)
      return []
    }

    // Avec execute_kw, le résultat est directement dans data.result
    const products = data.result || []

    // Log pour déboguer
    console.log('📦 Réponse Odoo:', {
      hasResult: !!products,
      resultLength: products.length || 0,
      firstProduct: products.length > 0 ? {
        id: products[0].id,
        name: products[0].name,
      } : null,
    })

    if (!products || products.length === 0) {
      console.warn('⚠️  Aucun produit retourné par Odoo')
      console.warn('   → Vérifiez que des produits existent dans Odoo')
      console.warn('   → Vérifiez que l\'utilisateur a les droits de lecture sur product.template')
      console.warn('   → Vérifiez les filtres dans la requête (actuellement: aucun filtre)')
      return []
    }
    
    console.log(`✅ ${products.length} template(s) de produit(s) récupéré(s) depuis Odoo`)

    // Récupérer toutes les variantes de tous les produits
    // On va récupérer les attributs (couleurs, tailles) depuis les variantes
    const variantIds = products.flatMap((p: any) => p.product_variant_ids || [])
    
    let variants: any[] = []
    if (variantIds.length > 0) {
      // Récupérer les variantes avec leurs attributs
      const variantRequest = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            ODOO_DB,
            auth.uid,
            auth.password,
            'product.product',
            'read',
            [variantIds],
            {
              fields: ['id', 'product_template_attribute_value_ids', 'attribute_value_ids'],
            },
          ],
        },
      }
      
      try {
        const variantResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(variantRequest),
        })
        const variantData = await variantResponse.json()
        variants = variantData.result || []
      } catch (error) {
        console.warn('⚠️  Impossible de récupérer les variantes, utilisation des valeurs par défaut')
      }
    }
    
    // Récupérer toutes les lignes d'attributs de tous les templates
    const allAttributeLineIds = products.flatMap((p: any) => p.attribute_line_ids || [])
    
    // Créer un cache pour les attributs et leurs valeurs
    const attributeCache = new Map<number, { name: string; values: Map<number, string> }>()
    
    if (allAttributeLineIds.length > 0) {
      // Récupérer toutes les lignes d'attributs
      const attributeLineRequest = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            ODOO_DB,
            auth.uid,
            auth.password,
            'product.template.attribute.line',
            'read',
            [allAttributeLineIds],
            {
              fields: ['attribute_id', 'value_ids', 'product_tmpl_id'],
            },
          ],
        },
      }
      
      try {
        const attributeLineResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attributeLineRequest),
        })
        const attributeLineData = await attributeLineResponse.json()
        const attributeLines = attributeLineData.result || []
        
        // Récupérer tous les attributs uniques
        const uniqueAttributeIds = [...new Set(attributeLines.map((al: any) => al.attribute_id[0]))]
        const attributeRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              ODOO_DB,
              auth.uid,
              auth.password,
              'product.attribute',
              'read',
              [uniqueAttributeIds],
              { fields: ['id', 'name'] },
            ],
          },
        }
        
        const attributeResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attributeRequest),
        })
        const attributeData = await attributeResponse.json()
        const attributes = attributeData.result || []
        
        // Récupérer toutes les valeurs d'attributs
        const allValueIds = [...new Set(attributeLines.flatMap((al: any) => al.value_ids || []))]
        if (allValueIds.length > 0) {
          const valueRequest = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [
                ODOO_DB,
                auth.uid,
                auth.password,
                'product.attribute.value',
                'read',
                [allValueIds],
                { fields: ['name', 'attribute_id'] },
              ],
            },
          }
          
          const valueResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(valueRequest),
          })
          const valueData = await valueResponse.json()
          const values = valueData.result || []
          
          // Construire le cache
          for (const attr of attributes) {
            const attrValues = new Map<number, string>()
            for (const val of values) {
              if (val.attribute_id[0] === attr.id) {
                attrValues.set(val.id, val.name)
              }
            }
            attributeCache.set(attr.id, { name: attr.name, values: attrValues })
          }
        }
      } catch (error) {
        console.warn('⚠️  Impossible de récupérer les attributs, utilisation des valeurs par défaut')
      }
    }
    
    // Transformer tous les produits (templates) en format Product avec leurs variantes
    // Traiter par lots pour éviter de surcharger Odoo avec trop de requêtes parallèles
    const BATCH_SIZE = 50 // Traiter 50 produits à la fois
    const transformedProducts: Product[] = []
    
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)
      console.log(`📦 Traitement du lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} (${batch.length} produits)`)
      
      // Récupérer toutes les références fournisseurs pour ce lot en une seule requête
      // seller_ids peut être un tableau d'IDs ou un tableau de tuples [id, name]
      const allSellerIds = batch.flatMap((p: any) => {
        if (!p.seller_ids || p.seller_ids.length === 0) return []
        // Si c'est un tableau de tuples [id, name], extraire les IDs
        return p.seller_ids.map((seller: any) => {
          if (Array.isArray(seller) && seller.length > 0) {
            return seller[0] // Prendre l'ID du tuple
          }
          return seller // Sinon, c'est déjà un ID
        })
      })
      const supplierReferencesMap = new Map<number, string>() // Map: seller_id -> product_code
      
      
      if (allSellerIds.length > 0) {
        try {
          const sellerRequest = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [
                ODOO_DB,
                auth.uid,
                auth.password,
                'product.supplierinfo',
                'read',
                [allSellerIds],
                { fields: ['id', 'product_code', 'product_name', 'name', 'code', 'vendor_code', 'supplier_code', 'product_tmpl_id'] },
              ],
            },
          }
          
          const sellerResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sellerRequest),
          })
          const sellerData = await sellerResponse.json()
          const sellers = sellerData.result || []
          
          // Créer une map pour accès rapide
          for (const seller of sellers) {
            // Essayer plusieurs champs possibles pour la référence fournisseur
            // Dans Odoo, le champ peut être : product_code, product_name, name, code, vendor_code, etc.
            const ref = seller.product_code || 
                       seller.product_name || 
                       seller.name || 
                       seller.code || 
                       seller.vendor_code ||
                       seller.supplier_code ||
                       seller.product_variant_code ||
                       seller.product_template_code ||
                       (seller.product_tmpl_id && seller.product_tmpl_id[1]) // Parfois dans le nom du produit template
            
            if (ref) {
              supplierReferencesMap.set(seller.id, ref)
            }
          }
          
          if (supplierReferencesMap.size > 0) {
            console.log(`  📦 ${supplierReferencesMap.size} référence(s) fournisseur(s) récupérée(s) pour ce lot`)
          }
        } catch (error) {
          console.warn(`  ⚠️  Erreur lors de la récupération des références fournisseurs:`, error)
        }
      }
      
      const batchResults = await Promise.all(
        batch.map(async (odooProduct: any) => {
        // Mapper la catégorie depuis la catégorie ecommerce (public_categ_ids) ou categ_id
        let category: ProductCategory = 'autre'
        
        // Essayer d'abord avec les catégories ecommerce/public
        if (odooProduct.public_categ_ids && odooProduct.public_categ_ids.length > 0) {
          // Récupérer les noms des catégories ecommerce
          const publicCategRequest = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [
                ODOO_DB,
                auth.uid,
                auth.password,
                'product.public.category',
                'read',
                [odooProduct.public_categ_ids],
                { fields: ['name'] },
              ],
            },
          }
          
          try {
            const publicCategResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(publicCategRequest),
            })
            const publicCategData = await publicCategResponse.json()
            const publicCategs = publicCategData.result || []
            
            // Chercher dans les catégories ecommerce
            for (const cat of publicCategs) {
              const catName = cat.name?.toLowerCase() || ''
              if (catName.includes('t-shirt') || catName.includes('tshirt')) {
                category = 'tshirt'
                break
              } else if (catName.includes('polo')) {
                category = 'polo'
                break
              } else if (catName.includes('sweat')) {
                category = 'sweat'
                break
              } else if (catName.includes('casquette')) {
                category = 'casquette'
                break
              }
            }
          } catch (error) {
            console.warn(`⚠️  Impossible de récupérer les catégories ecommerce pour le produit ${odooProduct.id}`)
          }
        }
        
        // Si pas trouvé dans les catégories ecommerce, utiliser categ_id
        if (category === 'autre' && odooProduct.categ_id) {
          const categName = odooProduct.categ_id[1]?.toLowerCase() || ''
          if (categName.includes('t-shirt') || categName.includes('tshirt')) {
            category = 'tshirt'
          } else if (categName.includes('polo')) {
            category = 'polo'
          } else if (categName.includes('sweat')) {
            category = 'sweat'
          } else if (categName.includes('casquette')) {
            category = 'casquette'
          }
        }

        // Récupérer les variantes (product.product) avec leurs prix
        const variantIds = odooProduct.product_variant_ids || []
        let variantPrices: Map<string, number> = new Map() // Map pour stocker les prix par combinaison couleur-taille
        
        if (variantIds.length > 0) {
          // Récupérer les variantes avec leurs prix et attributs
          const variantRequest = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [
                ODOO_DB,
                auth.uid,
                auth.password,
                'product.product',
                'read',
                [variantIds],
                {
                  fields: ['id', 'list_price', 'product_template_attribute_value_ids'],
                },
              ],
            },
          }
          
          try {
            const variantResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(variantRequest),
              signal: AbortSignal.timeout(30000), // Timeout de 30 secondes au lieu de 10
            })
            const variantData = await variantResponse.json()
            const variants = variantData.result || []
            
            // Récupérer les valeurs d'attributs des variantes pour mapper couleur/taille
            if (variants.length > 0) {
              const allAttributeValueIds = variants.flatMap((v: any) => v.product_template_attribute_value_ids || [])
              
              if (allAttributeValueIds.length > 0) {
                const attributeValueRequest = {
                  jsonrpc: '2.0',
                  method: 'call',
                  params: {
                    service: 'object',
                    method: 'execute_kw',
                    args: [
                      ODOO_DB,
                      auth.uid,
                      auth.password,
                      'product.template.attribute.value',
                      'read',
                      [allAttributeValueIds],
                      {
                        fields: ['attribute_id', 'product_attribute_value_id'],
                      },
                    ],
                  },
                }
                
                const attributeValueResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(attributeValueRequest),
                  signal: AbortSignal.timeout(30000), // Timeout de 30 secondes
                })
                const attributeValueData = await attributeValueResponse.json()
                const attributeValues = attributeValueData.result || []
                
                // Récupérer les noms des valeurs d'attributs
                const valueIds = attributeValues.map((av: any) => av.product_attribute_value_id[0])
                if (valueIds.length > 0) {
                  const valueNamesRequest = {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                      service: 'object',
                      method: 'execute_kw',
                      args: [
                        ODOO_DB,
                        auth.uid,
                        auth.password,
                        'product.attribute.value',
                        'read',
                        [valueIds],
                        {
                          fields: ['name', 'attribute_id'],
                        },
                      ],
                    },
                  }
                  
                  const valueNamesResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(valueNamesRequest),
                    signal: AbortSignal.timeout(30000), // Timeout de 30 secondes
                  })
                  const valueNamesData = await valueNamesResponse.json()
                  const valueNames = valueNamesData.result || []
                  
                  // Créer un map pour retrouver les noms de valeurs
                  const valueNameMap = new Map<number, { name: string; attributeId: number }>()
                  for (const vn of valueNames) {
                    valueNameMap.set(vn.id, {
                      name: vn.name,
                      attributeId: vn.attribute_id[0],
                    })
                  }
                  
                  // Mapper les prix par combinaison couleur-taille
                  console.log(`  💰 Mapping des prix pour ${variants.length} variante(s)`)
                  for (const variant of variants) {
                    const variantAttributeValueIds = variant.product_template_attribute_value_ids || []
                    let color = ''
                    let size = ''
                    
                    console.log(`    🔍 Variante ID ${variant.id}, prix: ${variant.list_price}, attributs: ${variantAttributeValueIds.length}`)
                    
                    for (const avId of variantAttributeValueIds) {
                      const av = attributeValues.find((a: any) => a.id === avId)
                      if (av) {
                        const valueInfo = valueNameMap.get(av.product_attribute_value_id[0])
                        if (valueInfo) {
                          // Vérifier si c'est un attribut couleur ou taille
                          const attrInfo = attributeCache.get(valueInfo.attributeId)
                          if (attrInfo) {
                            const attrName = attrInfo.name.toUpperCase().trim()
                            if (attrName === 'COLOR' || attrName === 'KLEUR') {
                              color = valueInfo.name
                              console.log(`      🎨 Couleur trouvée: ${color}`)
                            } else if (attrName === 'SIZE') {
                              size = valueInfo.name
                              console.log(`      📏 Taille trouvée: ${size}`)
                            } else {
                              console.log(`      ⚠️  Attribut ignoré: ${attrName} = ${valueInfo.name}`)
                            }
                          } else {
                            console.log(`      ⚠️  Attribut ID ${valueInfo.attributeId} non trouvé dans le cache`)
                          }
                        } else {
                          console.log(`      ⚠️  Valeur ID ${av.product_attribute_value_id[0]} non trouvée`)
                        }
                      } else {
                        console.log(`      ⚠️  AttributeValue ID ${avId} non trouvé`)
                      }
                    }
                    
                    // Stocker le prix avec la clé couleur-taille
                    if (color && size) {
                      const key = `${color}-${size}`
                      variantPrices.set(key, variant.list_price || 0)
                      console.log(`      ✅ Prix stocké: ${key} = ${variant.list_price}`)
                    } else if (color) {
                      variantPrices.set(color, variant.list_price || 0)
                      console.log(`      ✅ Prix stocké (couleur seule): ${color} = ${variant.list_price}`)
                    } else if (size) {
                      variantPrices.set(size, variant.list_price || 0)
                      console.log(`      ✅ Prix stocké (taille seule): ${size} = ${variant.list_price}`)
                    } else {
                      console.log(`      ⚠️  Variante ${variant.id} sans couleur ni taille, prix ignoré`)
                    }
                  }
                  
                  console.log(`  ✅ ${variantPrices.size} prix de variante(s) mappé(s)`)
                }
              }
            }
          } catch (error) {
            console.warn(`⚠️  Impossible de récupérer les prix des variantes pour le produit ${odooProduct.id}:`, error)
          }
        }
        
        // Récupérer les attributs de ce produit spécifique
        const productAttributeLineIds = odooProduct.attribute_line_ids || []
        let availableColors: string[] = ['Blanc', 'Noir'] // Valeurs par défaut
        let availableSizes: ProductSize[] = ['S', 'M', 'L', 'XL', '2XL'] // Valeurs par défaut
        
        // Récupérer les lignes d'attributs de ce produit
        if (productAttributeLineIds.length > 0) {
          const productAttributeLineRequest = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [
                ODOO_DB,
                auth.uid,
                auth.password,
                'product.template.attribute.line',
                'read',
                [productAttributeLineIds],
                { fields: ['attribute_id', 'value_ids'] },
              ],
            },
          }
          
          try {
            const productAttributeLineResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(productAttributeLineRequest),
            })
            const productAttributeLineData = await productAttributeLineResponse.json()
            const productAttributeLines = productAttributeLineData.result || []
            
            console.log(`🔍 Produit ${odooProduct.id} (${odooProduct.name}): ${productAttributeLines.length} ligne(s) d'attribut(s) trouvée(s)`)
            
            // Extraire les couleurs et tailles depuis les attributs de ce produit spécifique
            // Ne prendre en compte que les attributs nommés "COLOR" et "SIZE"
            for (const line of productAttributeLines) {
              if (!line.value_ids || line.value_ids.length === 0) {
                console.log(`  ⚠️  Ligne d'attribut sans value_ids`)
                continue
              }
              
              const attrId = line.attribute_id?.[0] || line.attribute_id
              if (!attrId) {
                console.log(`  ⚠️  Ligne d'attribut sans attribute_id`)
                continue
              }
              
              // Récupérer l'attribut depuis le cache ou directement
              let attrInfo = attributeCache.get(attrId)
              let attrName = ''
              
              if (!attrInfo) {
                // Récupérer l'attribut directement si pas dans le cache
                const attrRequest = {
                  jsonrpc: '2.0',
                  method: 'call',
                  params: {
                    service: 'object',
                    method: 'execute_kw',
                    args: [
                      ODOO_DB,
                      auth.uid,
                      auth.password,
                      'product.attribute',
                      'read',
                      [[attrId]],
                      { fields: ['name'] },
                    ],
                  },
                }
                try {
                  const attrResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(attrRequest),
                  })
                  const attrData = await attrResponse.json()
                  if (attrData.result && attrData.result.length > 0) {
                    attrName = attrData.result[0].name || ''
                    console.log(`  📋 Attribut trouvé: "${attrName}" (ID: ${attrId})`)
                  } else {
                    console.log(`  ⚠️  Attribut ID ${attrId} non trouvé dans la réponse`)
                    continue
                  }
                } catch (error) {
                  console.warn(`⚠️  Impossible de récupérer l'attribut ${attrId}:`, error)
                  continue
                }
              } else {
                attrName = attrInfo.name
                console.log(`  📋 Attribut depuis cache: "${attrName}" (ID: ${attrId})`)
              }
              
              // Vérifier que l'attribut s'appelle "COLOR" (ou "KLEUR" en néerlandais) ou "SIZE" (insensible à la casse)
              const attrNameUpper = attrName.toUpperCase().trim()
              const isColor = attrNameUpper === 'COLOR' || attrNameUpper === 'KLEUR'
              const isSize = attrNameUpper === 'SIZE'
              
              console.log(`  🔎 Vérification: "${attrName}" -> "${attrNameUpper}" (isColor: ${isColor}, isSize: ${isSize})`)
              
              if (!isColor && !isSize) {
                console.log(`  ℹ️  Attribut "${attrName}" ignoré (attendu: COLOR/KLEUR ou SIZE)`)
                continue
              }
              
              // Récupérer les valeurs de cet attribut pour ce produit
              const valueRequest = {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                  service: 'object',
                  method: 'execute_kw',
                  args: [
                    ODOO_DB,
                    auth.uid,
                    auth.password,
                    'product.attribute.value',
                    'read',
                    [line.value_ids],
                    { fields: ['name'] },
                  ],
                },
              }
              
              try {
                console.log(`  🔄 Récupération des valeurs pour "${attrName}" (${line.value_ids.length} valeur(s))`)
                const valueResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(valueRequest),
                })
                const valueData = await valueResponse.json()
                
                if (valueData.error) {
                  console.warn(`  ❌ Erreur Odoo:`, valueData.error)
                  continue
                }
                
                const values = (valueData.result || []).map((v: any) => v.name).filter(Boolean)
                console.log(`  📦 Valeurs récupérées pour "${attrName}":`, values)
                
                // Classer selon le type d'attribut
                if (isColor) {
                  if (values.length > 0) {
                    availableColors = values
                    console.log(`  ✅ Couleurs définies pour ${odooProduct.name}:`, availableColors)
                  } else {
                    console.log(`  ⚠️  Attribut COLOR trouvé mais aucune valeur récupérée pour ${odooProduct.name}`)
                  }
                } else if (isSize) {
                  if (values.length > 0) {
                    availableSizes = values as ProductSize[]
                    console.log(`  ✅ Tailles définies pour ${odooProduct.name}:`, availableSizes)
                  } else {
                    console.log(`  ⚠️  Attribut SIZE trouvé mais aucune valeur récupérée pour ${odooProduct.name}`)
                  }
                }
              } catch (error) {
                console.warn(`⚠️  Impossible de récupérer les valeurs pour l'attribut ${attrId} (${attrName}) du produit ${odooProduct.id}:`, error)
              }
            }
          } catch (error) {
            console.warn(`⚠️  Erreur lors de la récupération des attributs pour le produit ${odooProduct.id}:`, error)
            // Utiliser les valeurs par défaut en cas d'erreur
          }
        } else {
          console.log(`ℹ️  Produit ${odooProduct.id} (${odooProduct.name}): Aucun attribut trouvé, utilisation des valeurs par défaut`)
        }

        // Calculer le prix de base (minimum des prix des variantes ou prix du template)
        let basePrice = odooProduct.list_price || 0
        if (variantPrices.size > 0) {
          const prices = Array.from(variantPrices.values())
          basePrice = Math.min(...prices.filter(p => p > 0))
        }
        
        // Récupérer la référence fournisseur (Supplier Reference) depuis product.supplierinfo si nécessaire
        // Note: supplier_ref est maintenant récupéré directement depuis product.template
        let supplierReference: string | undefined = undefined
        if (odooProduct.seller_ids && odooProduct.seller_ids.length > 0) {
          // Extraire les IDs des seller_ids (peut être un tableau de tuples [id, name])
          const sellerIds = odooProduct.seller_ids.map((seller: any) => {
            if (Array.isArray(seller) && seller.length > 0) {
              return seller[0] // Prendre l'ID du tuple
            }
            return seller // Sinon, c'est déjà un ID
          })
          
          // Prendre la première référence fournisseur trouvée depuis product.supplierinfo
          for (const sellerId of sellerIds) {
            const ref = supplierReferencesMap.get(sellerId)
            if (ref) {
              supplierReference = ref
              break
            }
          }
        }
        
        return {
          id: odooProduct.id.toString(),
          name: odooProduct.name || 'Produit sans nom',
          defaultCode: odooProduct.default_code || undefined, // Référence produit (ex: K3025)
          supplierReference: odooProduct.supplier_ref || supplierReference || undefined, // Supplier Reference depuis product.template (supplier_ref) ou product.supplierinfo
          description: odooProduct.description_sale || odooProduct.description || '',
          category: category,
          basePrice: basePrice,
          availableSizes,
          availableColors,
          variantPrices: variantPrices.size > 0 ? Object.fromEntries(variantPrices) : undefined, // Prix par variante (clé: "Couleur-Taille" ou "Couleur" ou "Taille")
        }
      })
      )
      
      transformedProducts.push(...batchResults)
      console.log(`✅ Lot traité: ${transformedProducts.length}/${products.length} produits`)
      
      // Petite pause entre les lots pour ne pas surcharger le serveur
      if (i + BATCH_SIZE < products.length) {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms de pause
      }
    }
    
    console.log(`✅ ${transformedProducts.length} produit(s) créé(s) avec leurs variantes`)
    
    // Sauvegarder dans le cache
    await saveToCache(transformedProducts)
    
    return transformedProducts
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des produits depuis Odoo:', error)
    
    // En cas d'erreur, essayer de charger depuis le cache même s'il est expiré
    const cachedProducts = await loadFromCache()
    if (cachedProducts) {
      console.log('⚠️  Utilisation du cache expiré en cas d\'erreur')
      return cachedProducts
    }
    
    return []
  }
}

/**
 * Alternative: Utilisation de l'API REST d'Odoo (si disponible)
 */
export async function getProductsFromOdooREST(): Promise<Product[]> {
  try {
    const response = await fetch(`${ODOO_URL}/api/product.product`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: Cette fonction REST n'est pas utilisée actuellement
        // Si vous voulez l'utiliser, vous devrez passer les credentials différemment
      },
    })

    if (!response.ok) {
      console.error('Erreur lors de la récupération des produits')
      return []
    }

    const data = await response.json()
    
    // Transformer les données selon votre format
    return (data.data || []).map((odooProduct: any) => ({
      id: odooProduct.id?.toString() || '',
      name: odooProduct.name || 'Produit sans nom',
      description: odooProduct.description || '',
      basePrice: odooProduct.list_price || 0,
      availableSizes: odooProduct.sizes || ['S', 'M', 'L', 'XL'],
      availableColors: odooProduct.colors || ['Blanc', 'Noir'],
    }))
  } catch (error) {
    console.error('Erreur lors de la récupération des produits depuis Odoo (REST):', error)
    return []
  }
}


