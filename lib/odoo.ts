import { Quote } from '@/types'
import { TEXTILE_DISCOUNT_PERCENTAGE } from './data'
import { getDeliveryDate } from './delivery-dates'

/**
 * Configuration Odoo
 * À configurer dans les variables d'environnement
 */
const ODOO_URL = process.env.NEXT_PUBLIC_ODOO_URL || ''
const ODOO_DB = process.env.NEXT_PUBLIC_ODOO_DB || ''
const ODOO_USERNAME = process.env.NEXT_PUBLIC_ODOO_USERNAME || ''
const ODOO_PASSWORD = process.env.NEXT_PUBLIC_ODOO_PASSWORD || ''
const ODOO_API_KEY = process.env.ODOO_API_KEY || '' // Clé API optionnelle

/**
 * Authentification Odoo et récupération de l'UID
 * Supporte deux méthodes : clé API (recommandée) ou authentification par session
 */
async function authenticateOdoo(): Promise<number | null> {
  try {
    // Méthode 1 : Authentification par clé API (si disponible)
    if (ODOO_API_KEY) {
      // Avec clé API, on peut utiliser l'API JSON-RPC directement
      const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ODOO_API_KEY}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'res.users',
            method: 'search_read',
            args: [[['api_key_ids', '!=', false]]],
            kwargs: { limit: 1 },
          },
        }),
      })

      const data = await response.json()
      if (data.result && data.result.length > 0) {
        return data.result[0].id
      }
    }

    // Méthode 2 : Authentification par session (fallback)
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
          password: ODOO_PASSWORD,
        },
      }),
    })

    const data = await response.json()
    return data.result?.uid || null
  } catch (error) {
    console.error('Erreur d\'authentification Odoo:', error)
    return null
  }
}

/**
 * Authentification Odoo avec execute_kw
 * Utilise la même méthode que lib/odoo-products.ts et lib/odoo-auth.ts
 */
async function authenticateOdooForExecute(): Promise<{ uid: number; password: string } | null> {
  try {
    console.log('🔐 Tentative d\'authentification Odoo...')
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
          password: ODOO_PASSWORD,
        },
      }),
    })

    const data = await response.json()
    
    console.log('📥 Réponse authentification Odoo:', {
      hasResult: !!data.result,
      hasUid: !!(data.result && data.result.uid),
      hasError: !!data.error,
    })
    
    if (data.error) {
      console.error('❌ Erreur Odoo:', data.error)
      return null
    }
    
    if (data.result && data.result.uid) {
      console.log('✅ Authentification réussie, UID:', data.result.uid)
      return {
        uid: data.result.uid,
        password: ODOO_PASSWORD,
      }
    }
    
    console.error('❌ Authentification échouée, réponse complète:', JSON.stringify(data, null, 2))
    return null
  } catch (error) {
    console.error('❌ Erreur d\'authentification Odoo:', error)
    return null
  }
}

/**
 * Mapping des techniques vers les noms de produits Odoo (utilise la base de données)
 */
async function getOdooProductNameForTechnique(
  technique: string,
  techniqueOptions: any
): Promise<string | null> {
  const { getOdooProductNameForTechnique: getFromDB } = await import('./service-odoo-mapping-db')
  return await getFromDB(technique, techniqueOptions)
}

/**
 * Interface pour les détails de prix d'un service (frais fixes, options, etc.)
 */
interface ServicePriceBreakdown {
  fixedFees: number
  optionsSurcharge: number
  unitPrice: number
  quantity: number
  total: number
}

/**
 * Calcule les frais fixes et options pour un service
 * @param servicePricing - Les données de pricing (optionnel, si fourni évite un rechargement)
 */
async function calculateServicePriceBreakdown(
  technique: string,
  techniqueOptions: any,
  totalQuantity: number,
  servicePricing?: any[]
): Promise<ServicePriceBreakdown | null> {
  try {
    // Utiliser les données fournies ou charger depuis la DB
    const pricingData = servicePricing || await (await import('./service-pricing-db')).loadServicePricing()
    const pricing = pricingData.find((p: any) => p.technique === technique)
    
    if (!pricing) return null

    if (technique === 'serigraphie') {
      const serigraphieOptions = techniqueOptions as any
      const colorCount = serigraphieOptions.nombreCouleurs || 1
      const textileType = serigraphieOptions.textileType || 'clair'
      const selectedOptions = serigraphieOptions.selectedOptions || []
      const serigraphiePricing = pricing as any
      
      // Trouver la fourchette de quantité
      const quantityRange = serigraphiePricing.quantityRanges.find((r: any) => 
        totalQuantity >= r.min && (r.max === null || totalQuantity <= r.max)
      )
      if (!quantityRange) return null
      
      // Calculer le prix unitaire
      const key = `${quantityRange.label}-${colorCount}`
      const prices = textileType === 'clair' 
        ? (serigraphiePricing.pricesClair || serigraphiePricing.prices) 
        : (serigraphiePricing.pricesFonce || serigraphiePricing.prices)
      const unitPrice = prices[key] || 0
      
      // Frais fixes : montant par couleur
      const fixedFees = (serigraphiePricing.fixedFeePerColor || 0) * colorCount
      
      // Calculer le surcoût des options
      const basePrice = (unitPrice * totalQuantity) + fixedFees
      let optionsSurcharge = 0
      if (selectedOptions.length > 0 && serigraphiePricing.options) {
        const totalSurchargePercent = selectedOptions.reduce((total: number, optionId: string) => {
          const option = serigraphiePricing.options.find((opt: any) => opt.id === optionId)
          return total + (option?.surchargePercentage || 0)
        }, 0)
        optionsSurcharge = (basePrice * totalSurchargePercent) / 100
      }
      
      const total = basePrice + optionsSurcharge
      
      return {
        unitPrice,
        quantity: totalQuantity,
        fixedFees,
        optionsSurcharge,
        total,
      }
    } else if (technique === 'broderie') {
      const broderieOptions = techniqueOptions as any
      const pointCount = broderieOptions.nombrePoints || 0
      const embroiderySize = broderieOptions.embroiderySize || 'petite'
      const broderiePricing = pricing as any
      
      // Trouver la fourchette de quantité
      const quantityRange = broderiePricing.quantityRanges.find((r: any) => 
        totalQuantity >= r.min && (r.max === null || totalQuantity <= r.max)
      )
      if (!quantityRange) return null
      
      // Utiliser la bonne fourchette de points selon la taille de broderie
      const pointRanges = embroiderySize === 'petite' 
        ? (broderiePricing.pointRangesPetite || broderiePricing.pointRanges || [])
        : (broderiePricing.pointRangesGrande || broderiePricing.pointRanges || [])
      const pointRange = pointRanges.find((range: any) => 
        pointCount >= range.min && (range.max === null || pointCount <= range.max)
      )
      if (!pointRange) return null
      
      // Calculer le prix unitaire
      const key = `${quantityRange.label}-${pointRange.label}`
      const prices = embroiderySize === 'petite' 
        ? (broderiePricing.pricesPetite || broderiePricing.prices) 
        : (broderiePricing.pricesGrande || broderiePricing.prices)
      const unitPrice = prices[key] || 0
      
      // Frais fixes de digitalisation
      const fixedFees = pointCount <= (broderiePricing.smallDigitizationThreshold || 10000)
        ? (broderiePricing.fixedFeeSmallDigitization || 0)
        : (broderiePricing.fixedFeeLargeDigitization || 0)
      
      const total = (unitPrice * totalQuantity) + fixedFees
      
      return {
        unitPrice,
        quantity: totalQuantity,
        fixedFees,
        optionsSurcharge: 0, // Pas d'options pour la broderie
        total,
      }
    } else if (technique === 'dtf') {
      const dtfOptions = techniqueOptions as any
      const dimension = dtfOptions.dimension || '10x10 cm'
      const dtfPricing = pricing as any
      
      // Trouver la fourchette de quantité
      const quantityRange = dtfPricing.quantityRanges.find((r: any) => 
        totalQuantity >= r.min && (r.max === null || totalQuantity <= r.max)
      )
      if (!quantityRange) return null
      
      // Calculer le prix unitaire
      const key = `${quantityRange.label}-${dimension}`
      const unitPrice = dtfPricing.prices[key] || 0
      
      // Pas de frais fixes pour DTF
      const total = unitPrice * totalQuantity
      
      return {
        unitPrice,
        quantity: totalQuantity,
        fixedFees: 0,
        optionsSurcharge: 0,
        total,
      }
    }
    
    return null
  } catch (error) {
    console.error('❌ Erreur lors du calcul des frais fixes et options:', error)
    return null
  }
}

/**
 * Interface pour les informations complètes d'un produit Odoo
 */
interface OdooProductInfo {
  id: number
  uom_id: number | false
  uom_po_id: number | false
  tax_id: number[][] | false
  list_price?: number // Prix de vente (optionnel)
}

/**
 * Recherche d'un produit Odoo par son nom et récupération de ses informations complètes (avec prix)
 * Essaie d'abord une recherche exacte, puis une recherche insensible à la casse
 */
async function findOdooProductByName(
  productName: string,
  auth: { uid: number; password: string },
  includePrice: boolean = false
): Promise<OdooProductInfo | null> {
  try {
    console.log(`🔍 Recherche du produit Odoo: "${productName}"`)
    
    // Fonction pour chercher dans product.product
    const searchProductProduct = async (criteria: any[]): Promise<any> => {
      const requestBody = {
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
            'search_read',
            [criteria],
            {
              fields: includePrice 
                ? ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'list_price', 'type', 'sale_ok']
                : ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'type', 'sale_ok'],
              limit: 20,
            },
          ],
        },
      }

      const response = await fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.error) {
        console.error(`❌ Erreur lors de la recherche dans product.product:`, data.error)
        return []
      }

      return data.result || []
    }
    
    // Fonction pour chercher dans product.template (si product.product ne trouve rien)
    const searchProductTemplate = async (criteria: any[]): Promise<any> => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            ODOO_DB,
            auth.uid,
            auth.password,
            'product.template',
            'search_read',
            [criteria],
            {
              fields: includePrice 
                ? ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'list_price', 'type', 'sale_ok', 'product_variant_ids']
                : ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'type', 'sale_ok', 'product_variant_ids'],
              limit: 20,
            },
          ],
        },
      }

      const response = await fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.error) {
        console.error(`❌ Erreur lors de la recherche dans product.template:`, data.error)
        return []
      }

      return data.result || []
    }

    // Essayer recherche exacte dans product.product (avec filtre sale_ok = True)
    // Recherche par nom OU référence interne (default_code)
    console.log(`   🔎 Recherche exacte dans product.product: name ou default_code = "${productName}"`)
    let products = await searchProductProduct([
      '&',
      ['sale_ok', '=', true],
      ['|', ['name', '=', productName], ['default_code', '=', productName]]
    ])
    
    // Si pas de résultat, essayer sans filtre sale_ok
    if (!products || products.length === 0) {
      console.log(`   ⚠️ Recherche avec sale_ok échouée, tentative sans filtre...`)
      products = await searchProductProduct([
        '|', 
        ['name', '=', productName], 
        ['default_code', '=', productName]
      ])
    }
    
    // Si pas de résultat, essayer recherche insensible à la casse dans product.product
    if (!products || products.length === 0) {
      console.log(`   ⚠️ Recherche exacte échouée, tentative avec recherche insensible à la casse dans product.product...`)
      products = await searchProductProduct([
        '&',
        ['sale_ok', '=', true],
        ['|', ['name', 'ilike', productName], ['default_code', 'ilike', productName]]
      ])
      if (!products || products.length === 0) {
        products = await searchProductProduct([
          '|', 
          ['name', 'ilike', productName], 
          ['default_code', 'ilike', productName]
        ])
      }
    }
    
    // Si toujours pas de résultat, essayer recherche partielle dans product.product
    if (!products || products.length === 0) {
      console.log(`   ⚠️ Recherche insensible à la casse échouée, tentative avec recherche partielle dans product.product...`)
      products = await searchProductProduct([
        '&',
        ['sale_ok', '=', true],
        ['|', ['name', 'like', productName], ['default_code', 'like', productName]]
      ])
      if (!products || products.length === 0) {
        products = await searchProductProduct([
          '|', 
          ['name', 'like', productName], 
          ['default_code', 'like', productName]
        ])
      }
    }
    
    // Si toujours pas de résultat, essayer dans product.template
    // Pour les services (sérigraphie, broderie, etc.), la référence se trouve dans product.template.default_code
    if (!products || products.length === 0) {
      console.log(`   ⚠️ Aucun résultat dans product.product, tentative dans product.template (recherche par nom et default_code)...`)
      let templates = await searchProductTemplate([
        '&',
        ['sale_ok', '=', true],
        ['|', ['name', '=', productName], ['default_code', '=', productName]]
      ])
      
      if (!templates || templates.length === 0) {
        templates = await searchProductTemplate([
          '|', 
          ['name', '=', productName], 
          ['default_code', '=', productName]
        ])
      }
      
      if (!templates || templates.length === 0) {
        templates = await searchProductTemplate([
          '&',
          ['sale_ok', '=', true],
          ['|', ['name', 'ilike', productName], ['default_code', 'ilike', productName]]
        ])
      }
      
      if (!templates || templates.length === 0) {
        templates = await searchProductTemplate([
          '|', 
          ['name', 'ilike', productName], 
          ['default_code', 'ilike', productName]
        ])
      }
      
      if (!templates || templates.length === 0) {
        templates = await searchProductTemplate([
          '&',
          ['sale_ok', '=', true],
          ['|', ['name', 'like', productName], ['default_code', 'like', productName]]
        ])
      }
      
      if (!templates || templates.length === 0) {
        templates = await searchProductTemplate([
          '|', 
          ['name', 'like', productName], 
          ['default_code', 'like', productName]
        ])
      }
      
      // Si on trouve un template, récupérer la première variante (product.product)
      if (templates && templates.length > 0) {
        const template = templates[0]
        console.log(`   ✅ Template trouvé: "${template.name}" (ID: ${template.id}, Type: ${template.type || 'N/A'})`)
        if (template.product_variant_ids && template.product_variant_ids.length > 0) {
          const variantId = template.product_variant_ids[0]
          console.log(`   🔎 Récupération de la variante product.product ID: ${variantId}`)
          // Récupérer les détails de la variante
          const variantProducts = await searchProductProduct([['id', '=', variantId]])
          if (variantProducts && variantProducts.length > 0) {
            products = variantProducts
            console.log(`   ✅ Variante trouvée: "${variantProducts[0].name}" (Type: ${variantProducts[0].type || 'N/A'})`)
          }
        } else {
          // Si pas de variante, utiliser directement le template (pour les services sans variantes)
          console.log(`   ⚠️ Pas de variante, utilisation directe du template`)
          // Convertir le template en format product.product
          products = [{
            id: template.id,
            name: template.name,
            type: template.type,
            sale_ok: template.sale_ok,
            uom_id: template.uom_id,
            uom_po_id: template.uom_po_id,
            taxes_id: template.taxes_id,
            list_price: template.list_price,
          }]
        }
      }
    }

    // Afficher tous les produits trouvés pour déboguer
    if (products && products.length > 0) {
      console.log(`   📦 ${products.length} produit(s) trouvé(s):`)
      products.forEach((p: any, idx: number) => {
        const refInfo = p.default_code ? `, Réf: ${p.default_code}` : ''
        console.log(`      ${idx + 1}. "${p.name}"${refInfo} (ID: ${p.id}, Type: ${p.type || 'N/A'}, Sale OK: ${p.sale_ok || false})`)
      })
      
      // Filtrer pour ne garder que les produits de type "service"
      const serviceProducts = products.filter((p: any) => p.type === 'service')
      if (serviceProducts.length > 0) {
        console.log(`   ✅ ${serviceProducts.length} produit(s) de type "service" trouvé(s)`)
      } else {
        console.warn(`   ⚠️ Aucun produit de type "service" trouvé parmi les résultats`)
        console.warn(`   → Les produits trouvés sont de type: ${[...new Set(products.map((p: any) => p.type || 'N/A'))].join(', ')}`)
      }
      
      // Prendre le premier produit de type "service" qui correspond exactement (insensible à la casse)
      // Vérifier par nom OU par référence interne (default_code)
      let product = serviceProducts.length > 0 
        ? serviceProducts.find((p: any) => 
            (p.name && p.name.toLowerCase() === productName.toLowerCase()) ||
            (p.default_code && p.default_code.toLowerCase() === productName.toLowerCase())
          )
        : null
      
      // Si pas de correspondance exacte dans les services, prendre le premier service
      if (!product && serviceProducts.length > 0) {
        product = serviceProducts[0]
        console.log(`   ⚠️ Aucune correspondance exacte, utilisation du premier service: "${product.name}"`)
      }
      
      // Si toujours pas de produit service, prendre le premier produit (avec avertissement)
      if (!product && products.length > 0) {
        product = products[0]
        console.warn(`   ⚠️ Aucun produit de type "service" trouvé, utilisation du premier résultat: "${product.name}" (Type: ${product.type || 'N/A'})`)
      }
      
      if (product) {
        // Format des taxes pour Odoo: [(6, 0, [id1, id2, ...])] pour remplacer toutes les taxes
        let taxId: number[][] | false = false
        if (product.taxes_id && Array.isArray(product.taxes_id) && product.taxes_id.length > 0) {
          // product.taxes_id est un tableau d'IDs [id1, id2, ...]
          const taxIds = product.taxes_id
          taxId = [[6, 0, taxIds]]
        }
        
        const productInfo: OdooProductInfo = {
          id: product.id,
          uom_id: product.uom_id && Array.isArray(product.uom_id) ? product.uom_id[0] : false,
          uom_po_id: product.uom_po_id && Array.isArray(product.uom_po_id) ? product.uom_po_id[0] : false,
          tax_id: taxId,
          list_price: includePrice ? (product.list_price || 0) : undefined,
        }
        const foundBy = (product.name && product.name.toLowerCase() === productName.toLowerCase()) 
          ? 'nom' 
          : (product.default_code && product.default_code.toLowerCase() === productName.toLowerCase())
          ? 'référence interne'
          : 'recherche partielle'
        const refInfo = product.default_code ? ` (Réf: ${product.default_code})` : ''
        console.log(`✅ Produit trouvé par ${foundBy}: "${product.name}"${refInfo} (ID: ${productInfo.id}, UOM: ${productInfo.uom_id}, Taxes: ${productInfo.tax_id ? 'oui' : 'non'})`)
        return productInfo
      }
    }

    console.warn(`⚠️ Produit non trouvé: "${productName}"`)
    console.warn(`   → Vérifiez que le produit existe dans Odoo avec ce nom exact`)
    console.warn(`   → Vérifiez les permissions d'accès au produit`)
    return null
  } catch (error) {
    console.error(`❌ Erreur lors de la recherche du produit "${productName}":`, error)
    return null
  }
}

/**
 * Recherche d'une variante de produit Odoo par nom de template, couleur et taille
 */
/**
 * Recherche un produit Odoo par référence interne (default_code)
 * Essaie d'abord dans product.product, puis dans product.template si nécessaire
 */
async function findOdooProductByCode(
  productCode: string,
  auth: { uid: number; password: string }
): Promise<OdooProductInfo | null> {
  try {
    const trimmedCode = productCode.trim()
    if (!trimmedCode) {
      console.log(`⚠️ Code produit vide, recherche annulée`)
      return null
    }
    
    console.log(`🔍 Recherche du produit Odoo par référence interne: "${trimmedCode}"`)
    
    // Essayer d'abord dans product.product avec les filtres stricts
    let searchRequest = {
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
          'search_read',
          [
            [
              ['default_code', '=', trimmedCode],
              ['sale_ok', '=', true],
              ['type', '=', 'service'],
            ],
          ],
          {
            fields: ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'type', 'sale_ok'],
            limit: 1,
          },
        ],
      },
    }
    
    let searchResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    })
    
    let searchData = await searchResponse.json()
    
    // Si pas trouvé, essayer sans le filtre type
    if (!searchData.result || searchData.result.length === 0) {
      console.log(`⚠️ Produit non trouvé avec filtres stricts, recherche sans filtre type...`)
      searchRequest = {
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
            'search_read',
            [
              [
                ['default_code', '=', trimmedCode],
                ['sale_ok', '=', true],
              ],
            ],
            {
              fields: ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'type', 'sale_ok'],
              limit: 5,
            },
          ],
        },
      }
      
      searchResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchRequest),
      })
      
      searchData = await searchResponse.json()
    }
    
    // Si toujours pas trouvé, essayer dans product.template
    if (!searchData.result || searchData.result.length === 0) {
      console.log(`⚠️ Produit non trouvé dans product.product, recherche dans product.template...`)
      searchRequest = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            ODOO_DB,
            auth.uid,
            auth.password,
            'product.template',
            'search_read',
            [
              [
                ['default_code', '=', trimmedCode],
                ['sale_ok', '=', true],
              ],
            ],
            {
              fields: ['id', 'name', 'default_code', 'type', 'sale_ok', 'product_variant_ids'],
              limit: 1,
            },
          ],
        },
      }
      
      searchResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchRequest),
      })
      
      searchData = await searchResponse.json()
      
      // Si trouvé dans template, récupérer le product.product correspondant
      if (searchData.result && searchData.result.length > 0) {
        const template = searchData.result[0]
        console.log(`📦 Template trouvé: "${template.name}" (ID: ${template.id}, Réf: ${template.default_code || 'N/A'})`)
        
        if (template.product_variant_ids && template.product_variant_ids.length > 0) {
          const variantId = template.product_variant_ids[0]
          // Récupérer le product.product
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
                [[variantId]],
                {
                  fields: ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'type', 'sale_ok'],
                },
              ],
            },
          }
          
          const variantResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variantRequest),
          })
          
          const variantData = await variantResponse.json()
          if (variantData.result && variantData.result.length > 0) {
            searchData.result = variantData.result
          }
        }
      }
    }
    
    if (searchData.result && searchData.result.length > 0) {
      console.log(`📦 ${searchData.result.length} produit(s) trouvé(s) avec la référence "${trimmedCode}":`)
      searchData.result.forEach((p: any, idx: number) => {
        console.log(`   ${idx + 1}. "${p.name}" (ID: ${p.id}, Réf: ${p.default_code || 'N/A'}, Type: ${p.type || 'N/A'}, Sale OK: ${p.sale_ok || false})`)
      })
      
      const product = searchData.result[0]
      return {
        id: product.id,
        name: product.name,
        default_code: product.default_code || '',
        uom_id: product.uom_id && Array.isArray(product.uom_id) ? product.uom_id[0] : null,
        uom_po_id: product.uom_po_id && Array.isArray(product.uom_po_id) ? product.uom_po_id[0] : null,
        tax_id: (product.taxes_id && Array.isArray(product.taxes_id) ? product.taxes_id : []) as any,
        type: product.type || 'service',
        sale_ok: product.sale_ok || false,
      } as any
    } else {
      console.log(`⚠️ Produit Odoo avec référence "${trimmedCode}" non trouvé dans Odoo`)
      console.log(`   → Vérifiez que le produit existe avec la référence interne exacte: "${trimmedCode}"`)
      console.log(`   → Vérifiez que le produit a sale_ok = true`)
      console.log(`   → Vérifiez dans product.product ET product.template`)
      return null
    }
  } catch (error) {
    console.warn(`⚠️ Erreur lors de la recherche du produit par code:`, error)
    return null
  }
}

async function findOdooProductVariant(
  productTemplateName: string,
  color: string,
  size: string,
  auth: { uid: number; password: string }
): Promise<OdooProductInfo | null> {
  try {
    console.log(`🔍 Recherche de la variante Odoo: "${productTemplateName}" - ${color} - ${size}`)
    
    // D'abord, trouver le template de produit
    const templateRequest = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          auth.uid,
          auth.password,
          'product.template',
          'search_read',
          [
            [['name', '=', productTemplateName]],
          ],
          {
            fields: ['id', 'name'],
            limit: 1,
          },
        ],
      },
    }

    const templateResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateRequest),
    })

    const templateData = await templateResponse.json()

    if (templateData.error || !templateData.result || templateData.result.length === 0) {
      console.warn(`⚠️ Template de produit "${productTemplateName}" non trouvé`)
      return null
    }

    const templateId = templateData.result[0].id
    console.log(`✅ Template trouvé: "${productTemplateName}" (ID: ${templateId})`)

    // Rechercher les valeurs d'attributs pour la couleur et la taille
    const colorValueRequest = {
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
          'search_read',
          [
            [['name', '=', color]],
          ],
          {
            fields: ['id', 'name', 'attribute_id'],
            limit: 1,
          },
        ],
      },
    }

    const sizeValueRequest = {
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
          'search_read',
          [
            [['name', '=', size]],
          ],
          {
            fields: ['id', 'name', 'attribute_id'],
            limit: 1,
          },
        ],
      },
    }

    const [colorResponse, sizeResponse] = await Promise.all([
      fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(colorValueRequest),
      }),
      fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sizeValueRequest),
      }),
    ])

    const colorData = await colorResponse.json()
    const sizeData = await sizeResponse.json()

    const colorValueId = colorData.result && colorData.result.length > 0 ? colorData.result[0].id : null
    const sizeValueId = sizeData.result && sizeData.result.length > 0 ? sizeData.result[0].id : null

    if (!colorValueId || !sizeValueId) {
      console.warn(`⚠️ Valeurs d'attributs non trouvées: couleur="${color}" (${colorValueId}), taille="${size}" (${sizeValueId})`)
      // Essayer de trouver la variante sans les attributs (peut-être que le produit n'a pas de variantes)
      return await findOdooProductByName(productTemplateName, auth, true)
    }

    // Rechercher la variante avec ces attributs
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
          'search_read',
          [
            [
              ['product_tmpl_id', '=', templateId],
              ['product_template_attribute_value_ids', 'in', [colorValueId, sizeValueId]],
            ],
          ],
          {
            fields: ['id', 'name', 'uom_id', 'uom_po_id', 'taxes_id', 'list_price'],
          },
        ],
      },
    }

    const variantResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variantRequest),
    })

    const variantData = await variantResponse.json()

    if (variantData.error) {
      console.error(`❌ Erreur lors de la recherche de la variante:`, variantData.error)
      return null
    }

    // Filtrer pour trouver la variante qui a exactement ces deux attributs
    if (variantData.result && variantData.result.length > 0) {
      // Récupérer les valeurs d'attributs de chaque variante pour vérifier
      for (const variant of variantData.result) {
        // Récupérer les valeurs d'attributs de cette variante
        const variantAttrRequest = {
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
              [[variant.id]],
              {
                fields: ['product_template_attribute_value_ids'],
              },
            ],
          },
        }

        const variantAttrResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(variantAttrRequest),
        })

        const variantAttrData = await variantAttrResponse.json()
        
        if (variantAttrData.result && variantAttrData.result.length > 0) {
          const attrValueIds = variantAttrData.result[0].product_template_attribute_value_ids || []
          
          // Vérifier si cette variante a les deux attributs (couleur et taille)
          // On doit vérifier les product_attribute_value_id dans product_template_attribute_value_ids
          const attrValueReadRequest = {
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
                [attrValueIds],
                {
                  fields: ['product_attribute_value_id'],
                },
              ],
            },
          }

          const attrValueReadResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attrValueReadRequest),
          })

          const attrValueReadData = await attrValueReadResponse.json()
          
          if (attrValueReadData.result) {
            const actualValueIds = attrValueReadData.result.map((av: any) => av.product_attribute_value_id[0])
            
            if (actualValueIds.includes(colorValueId) && actualValueIds.includes(sizeValueId)) {
              // Format des taxes
              let taxId: number[][] | false = false
              if (variant.taxes_id && Array.isArray(variant.taxes_id) && variant.taxes_id.length > 0) {
                const taxIds = variant.taxes_id
                taxId = [[6, 0, taxIds]]
              }
              
              const productInfo: OdooProductInfo = {
                id: variant.id,
                uom_id: variant.uom_id && Array.isArray(variant.uom_id) ? variant.uom_id[0] : false,
                uom_po_id: variant.uom_po_id && Array.isArray(variant.uom_po_id) ? variant.uom_po_id[0] : false,
                tax_id: taxId,
                list_price: variant.list_price || 0,
              }
              
              console.log(`✅ Variante trouvée: "${productTemplateName}" - ${color} - ${size} (ID: ${productInfo.id})`)
              return productInfo
            }
          }
        }
      }
    }

    // Si aucune variante exacte n'est trouvée, essayer de trouver le produit template sans variantes
    console.warn(`⚠️ Variante "${productTemplateName}" - ${color} - ${size} non trouvée, tentative avec le template`)
    return await findOdooProductByName(productTemplateName, auth, true)
  } catch (error) {
    console.error(`❌ Erreur lors de la recherche de la variante "${productTemplateName}" - ${color} - ${size}:`, error)
    return null
  }
}

/**
 * Met à jour les champs personnalisés d'une commande Odoo après sa création
 */
async function updateOrderFieldsAfterCreation(
  orderId: number,
  auth: { uid: number; password: string },
  productionDateStr: string,
  orderSpeed: string,
  deliveryType: string
): Promise<void> {
  try {
    const fieldsToUpdate: any = {}
    
    // Essayer d'ajouter production_date
    fieldsToUpdate.production_date = productionDateStr
    
    // Mapper le type de livraison vers le champ DELIVERY
    const deliveryMappingForField: Record<string, string> = {
      'pickup': 'PICKUP',
      'dpd': 'DPD',
      'client_carrier': 'DELIVERYCLIENT',
      'courier': 'COURSIER',
    }
    fieldsToUpdate.DELIVERY = deliveryMappingForField[deliveryType] || deliveryType
    
    // Note: order_speed n'est pas ajouté car il attend probablement un entier (ID de sélection)
    // Vous devrez configurer cela dans Odoo ou mapper les valeurs correctement
    
    const writeRequestBody = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          auth.uid,
          auth.password,
          'sale.order',
          'write',
          [[orderId], fieldsToUpdate],
        ],
      },
    }
    
    const writeResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(writeRequestBody),
    })
    
    const writeData = await writeResponse.json()
    if (writeData.error) {
      console.log(`⚠️ Impossible de mettre à jour les champs personnalisés:`, writeData.error.message || 'Erreur inconnue')
      console.log(`   → Date de production calculée: ${productionDateStr}`)
      console.log(`   → Vitesse de commande: ${orderSpeed}`)
      console.log(`   → Type de livraison: ${deliveryType}`)
      console.log(`   → Ces informations sont disponibles dans les notes de la commande.`)
    } else {
      console.log(`✅ Champs personnalisés mis à jour avec succès (production_date: ${productionDateStr}, DELIVERY: ${fieldsToUpdate.DELIVERY})`)
    }
  } catch (error) {
    console.warn('⚠️ Erreur lors de la mise à jour des champs personnalisés:', error)
  }
}

/**
 * Création d'un devis dans Odoo (module vente - sale.order)
 * @param quote - Le devis à créer
 * @param partnerId - L'ID du partenaire (client) dans Odoo
 */
export async function createQuoteInOdoo(
  quote: Quote,
  partnerId: number
): Promise<{ success: boolean; quoteId?: string; error?: string }> {
  try {
    console.log('📤 Création du devis dans Odoo pour le partenaire:', partnerId)
    console.log('📋 Nombre d\'articles:', quote.items.length)
    
    // Authentification
    const auth = await authenticateOdooForExecute()
    if (!auth) {
      console.error('❌ Échec de l\'authentification Odoo')
      return { success: false, error: 'Échec de l\'authentification Odoo' }
    }
    
    console.log('✅ Authentification réussie, UID:', auth.uid)

    // Charger la configuration des prix pour obtenir la remise textile (une seule fois)
    const { loadPricingConfig } = await import('./pricing-config-db')
    const pricingConfig = await loadPricingConfig()
    const textileDiscountPercentage = pricingConfig.textileDiscountPercentage || 0
    
    // Précharger les données qui seront utilisées plusieurs fois
    const { loadServicePricing } = await import('./service-pricing-db')
    const servicePricing = await loadServicePricing()
    const { calculateShippingCostSync, calculateCartons } = await import('./shipping')
    
    console.log(`💰 Remise textile configurée: ${textileDiscountPercentage}%`)

    // Préparer les lignes de commande
    const orderLines: any[] = []
    const allFiles: Array<{ name: string; marking: string; url?: string; size?: string }> = [] // Collecter tous les fichiers pour les notes
    
    // Précalculer les produits sélectionnés pour calculateCartons (utilisé plusieurs fois)
    const selectedProductsForShipping: any[] = quote.items.map(item => ({
      product: item.product,
      colorQuantities: item.colorQuantities,
    }))
    
    for (const item of quote.items) {
      const isBlank = item.product.id.startsWith('blank-')
      
      // Collecter les fichiers pour ce marquage
      if (item.files && item.files.length > 0) {
        item.files.forEach(file => {
          allFiles.push({
            name: file.name,
            marking: `${item.product.name} - ${item.technique}`,
          })
        })
      }

      // ÉTAPE 1: Créer les lignes pour les produits textiles (si ce n'est pas un blank fourni par le client)
      if (!item.clientProvided && !isBlank) {
        for (const colorQuantity of item.colorQuantities) {
          for (const sizeQuantity of colorQuantity.quantities) {
            if (sizeQuantity.quantity <= 0) continue // Ignorer les quantités nulles

            console.log(`📦 Ligne produit textile: ${item.product.name} - ${colorQuantity.color} - ${sizeQuantity.size} - Quantité: ${sizeQuantity.quantity}`)

            // Rechercher la variante du produit textile dans Odoo
            const textileVariant = await findOdooProductVariant(
              item.product.name,
              colorQuantity.color,
              sizeQuantity.size,
              auth
            )

            if (textileVariant) {
              // Créer une ligne pour le produit textile
              const textileLineData: any = {
                name: `${item.product.name} - ${colorQuantity.color} - ${sizeQuantity.size}`,
                product_id: textileVariant.id,
                product_uom_qty: sizeQuantity.quantity,
                display_type: false, // Ligne comptable
              }

              if (textileVariant.uom_id) {
                textileLineData.product_uom = textileVariant.uom_id
              }

              if (textileVariant.tax_id) {
                textileLineData.tax_id = textileVariant.tax_id
              }

              // Utiliser le prix de la variante si disponible
              if (textileVariant.list_price) {
                textileLineData.price_unit = textileVariant.list_price
              }

              // Ajouter la remise textile si configurée
              if (textileDiscountPercentage > 0) {
                textileLineData.discount = textileDiscountPercentage
                console.log(`   💰 Remise textile appliquée: ${textileDiscountPercentage}%`)
              }

              orderLines.push([0, 0, textileLineData])
              console.log(`✅ Ligne produit textile créée: ${item.product.name} - ${colorQuantity.color} - ${sizeQuantity.size} (ID: ${textileVariant.id}${textileDiscountPercentage > 0 ? `, Remise: ${textileDiscountPercentage}%` : ''})`)
            } else {
              console.warn(`⚠️ Variante textile "${item.product.name}" - ${colorQuantity.color} - ${sizeQuantity.size} non trouvée dans Odoo`)
              // Créer une ligne de note si le produit n'existe pas
              orderLines.push([
                0,
                0,
                {
                  name: `${item.product.name} - ${colorQuantity.color} - ${sizeQuantity.size} (Quantité: ${sizeQuantity.quantity}) - PRODUIT NON TROUVÉ DANS ODOO`,
                  display_type: 'line_note',
                },
              ])
            }
          }
        }
      }

      // ÉTAPE 2: Créer les lignes pour les services (marquages) - REGROUPÉES par technique
      // Calculer la quantité totale pour ce service
      const totalServiceQuantity = item.colorQuantities.reduce((total, cq) => {
        return total + cq.quantities.reduce((sum, q) => sum + q.quantity, 0)
      }, 0)

      if (totalServiceQuantity > 0) {
        const odooProductName = await getOdooProductNameForTechnique(item.technique, item.techniqueOptions)
        console.log(`🔍 Nom du produit service Odoo recherché: "${odooProductName}"`)

        // Rechercher le produit service Odoo
        let odooServiceInfo: OdooProductInfo | null = null
        if (odooProductName) {
          odooServiceInfo = await findOdooProductByName(odooProductName, auth, true) // includePrice = true pour avoir le prix
          if (!odooServiceInfo) {
            console.error(`❌ Produit service Odoo "${odooProductName}" non trouvé dans Odoo`)
            console.error(`   → Vérifiez que le produit existe dans Odoo avec le nom exact: "${odooProductName}"`)
            console.error(`   → Vérifiez le mapping dans l'interface admin (Techniques > Mapping Odoo)`)
            // On continue quand même pour créer une ligne de note, mais on log l'erreur
          } else {
            console.log(`✅ Produit service Odoo trouvé: "${odooProductName}" (ID: ${odooServiceInfo.id})`)
          }
        } else {
          console.error(`❌ Aucun mapping configuré pour la technique "${item.technique}"`)
          console.error(`   → Configurez le mapping dans l'interface admin (Techniques > Mapping Odoo)`)
        }

        // Construire la description détaillée avec toutes les informations
        const detailsBySize = item.colorQuantities.map(cq => {
          const sizes = cq.quantities
            .filter(q => q.quantity > 0)
            .map(q => `${q.size} (${q.quantity})`)
            .join(', ')
          return sizes ? `${cq.color}: ${sizes}` : null
        }).filter(Boolean).join(' | ')

        const serviceDescription = [
          `Service: ${item.technique}`,
          `Produit: ${item.product.name}`,
          `Détails: ${detailsBySize}`,
          `Quantité totale: ${totalServiceQuantity}`,
          item.clientProvided ? '⚠️ FOURNI PAR LE CLIENT' : '',
          `Options: ${JSON.stringify(item.techniqueOptions)}`,
          `Position: ${item.position ? (item.position.type === 'custom' ? item.position.customDescription : item.position.type) : 'N/A'}`,
          item.notes ? `Notes: ${item.notes}` : '',
        ].filter(Boolean).join('\n')

        // Calculer les frais fixes et options (utiliser les données préchargées)
        const priceBreakdown = await calculateServicePriceBreakdown(
          item.technique,
          item.techniqueOptions,
          totalServiceQuantity,
          servicePricing
        )

        // Créer UNE SEULE ligne de service avec la quantité totale
        let serviceLineData: any

        if (odooServiceInfo) {
          // Ligne comptable avec produit service existant
          serviceLineData = {
            name: serviceDescription,
            product_id: odooServiceInfo.id,
            product_uom_qty: totalServiceQuantity,
            display_type: false, // Ligne comptable
          }
          
          console.log(`✅ Produit service Odoo associé: ${odooServiceInfo.id} (Quantité: ${totalServiceQuantity})`)
          
          if (odooServiceInfo.uom_id) {
            serviceLineData.product_uom = odooServiceInfo.uom_id
          }
          
          if (odooServiceInfo.tax_id) {
            serviceLineData.tax_id = odooServiceInfo.tax_id
          }
          
          // Utiliser le prix unitaire calculé (sans frais fixes ni options)
          if (priceBreakdown) {
            serviceLineData.price_unit = priceBreakdown.unitPrice
            console.log(`   💰 Prix unitaire: ${priceBreakdown.unitPrice.toFixed(2)}€ HT`)
          }
          
          // Si le client fournit le produit, appliquer l'indexation sur le prix du service (utiliser pricingConfig déjà chargé)
          if (item.clientProvided && priceBreakdown) {
            const basePrice = priceBreakdown.unitPrice
            const indexationPercent = pricingConfig.clientProvidedIndexation || 10
            const indexedPrice = basePrice * (1 + indexationPercent / 100)
            serviceLineData.price_unit = indexedPrice
            console.log(`   ⚠️ Produit fourni par le client - Prix du service indexé de ${indexationPercent}%: ${indexedPrice.toFixed(2)}€`)
          }
        } else {
          // Si pas de produit service trouvé, créer une ligne de note
          console.warn(`⚠️ Produit service Odoo "${odooProductName}" non trouvé - création d'une ligne de note`)
          serviceLineData = {
            name: serviceDescription,
            display_type: 'line_note',
          }
        }

        orderLines.push([0, 0, serviceLineData])

        // Ajouter les lignes pour les frais fixes et options si calculés
        if (priceBreakdown && odooServiceInfo) {
          // Ligne pour les frais fixes
          if (priceBreakdown.fixedFees > 0) {
            const { getOdooProductNameForFixedFee } = await import('./service-odoo-fee-mapping-db')
            
            let fixedFeeProductId: number | null = null
            let fixedFeeUomId: any = false
            let fixedFeeTaxId: any = false
            
            // Déterminer le type de frais fixes
            let feeType: string | null = null
            if (item.technique === 'serigraphie') {
              feeType = 'colorFee'
            } else if (item.technique === 'broderie') {
              const broderieOptions = item.techniqueOptions as any
              const pointCount = broderieOptions.nombrePoints || 0
              // Utiliser les données de pricing déjà chargées
              const pricing = servicePricing.find((p: any) => p.technique === 'broderie')
              const smallDigitizationThreshold = (pricing as any)?.smallDigitizationThreshold || 10000
              feeType = pointCount <= smallDigitizationThreshold ? 'smallDigitization' : 'largeDigitization'
            }
            
            // Chercher le produit Odoo pour ce frais fixe si mapping configuré
            if (feeType) {
              const feeProductName = await getOdooProductNameForFixedFee(item.technique, feeType)
              if (feeProductName) {
                const feeProductInfo = await findOdooProductByName(feeProductName, auth, false)
                if (feeProductInfo) {
                  fixedFeeProductId = feeProductInfo.id
                  fixedFeeUomId = feeProductInfo.uom_id || false
                  fixedFeeTaxId = feeProductInfo.tax_id || false
                  console.log(`   ✅ Produit Odoo trouvé pour frais fixes: "${feeProductName}" (ID: ${fixedFeeProductId})`)
                } else {
                  console.warn(`   ⚠️ Produit Odoo "${feeProductName}" non trouvé pour frais fixes, utilisation du produit service de base`)
                }
              }
            }
            
            // Utiliser le produit spécifique si trouvé, sinon le produit service de base
            const feeProductId = fixedFeeProductId || odooServiceInfo.id
            const feeUomId = fixedFeeUomId !== false ? fixedFeeUomId : (odooServiceInfo.uom_id || false)
            const feeTaxId = fixedFeeTaxId !== false ? fixedFeeTaxId : (odooServiceInfo.tax_id || false)
            
            const fixedFeesDescription = item.technique === 'serigraphie'
              ? `Frais fixes sérigraphie (${(item.techniqueOptions as any).nombreCouleurs || 1} couleur(s))`
              : item.technique === 'broderie'
              ? `Frais fixes digitalisation broderie`
              : `Frais fixes ${item.technique}`
            
            orderLines.push([
              0,
              0,
              {
                name: fixedFeesDescription,
                product_id: feeProductId,
                product_uom_qty: 1,
                price_unit: priceBreakdown.fixedFees,
                display_type: false,
                product_uom: feeUomId,
                tax_id: feeTaxId,
              },
            ])
            console.log(`   💰 Ligne frais fixes ajoutée: ${priceBreakdown.fixedFees.toFixed(2)}€ HT (Produit ID: ${feeProductId})`)
          }

          // Ligne pour les options (surcoût)
          if (priceBreakdown.optionsSurcharge > 0) {
            const serigraphieOptions = item.techniqueOptions as any
            const selectedOptions = serigraphieOptions.selectedOptions || []
            
            // Charger les options pour avoir les noms (utiliser les données déjà chargées)
            const { getOdooProductNameForOption } = await import('./service-odoo-fee-mapping-db')
            const pricing = servicePricing.find((p: any) => p.technique === 'serigraphie')
            
              // Pour chaque option, créer une ligne si mapping configuré, sinon créer une ligne globale
            if (selectedOptions.length > 0) {
              // Calculer le prix de base pour calculer le surcoût par option
              const basePrice = ((priceBreakdown.unitPrice * priceBreakdown.quantity) + priceBreakdown.fixedFees)
              
              // Essayer de trouver un mapping pour chaque option
              let mappedOptionsTotal = 0
              let unmappedOptionNames: string[] = []
              
              for (const optId of selectedOptions) {
                const optionProductName = await getOdooProductNameForOption('serigraphie', optId)
                const option = (pricing as any)?.options?.find((opt: any) => opt.id === optId)
                
                if (!option) continue
                
                if (optionProductName) {
                  const optionProductInfo = await findOdooProductByName(optionProductName, auth, false)
                  if (optionProductInfo) {
                    // Calculer le montant pour cette option spécifique
                    const optionSurcharge = (basePrice * (option.surchargePercentage || 0)) / 100
                    mappedOptionsTotal += optionSurcharge
                    
                    orderLines.push([
                      0,
                      0,
                      {
                        name: `Option sérigraphie: ${option.name}`,
                        product_id: optionProductInfo.id,
                        product_uom_qty: 1,
                        price_unit: optionSurcharge,
                        display_type: false,
                        product_uom: optionProductInfo.uom_id || false,
                        tax_id: optionProductInfo.tax_id || false,
                      },
                    ])
                    console.log(`   💰 Ligne option "${option.name}" ajoutée: ${optionSurcharge.toFixed(2)}€ HT (Produit ID: ${optionProductInfo.id})`)
                  } else {
                    unmappedOptionNames.push(option.name)
                  }
                } else {
                  unmappedOptionNames.push(option.name)
                }
              }
              
              // Si certaines options n'ont pas de mapping, créer une ligne globale avec le reste
              if (unmappedOptionNames.length > 0) {
                const unmappedSurcharge = priceBreakdown.optionsSurcharge - mappedOptionsTotal
                if (unmappedSurcharge > 0) {
                  orderLines.push([
                    0,
                    0,
                    {
                      name: `Options sérigraphie: ${unmappedOptionNames.join(', ')}`,
                      product_id: odooServiceInfo.id,
                      product_uom_qty: 1,
                      price_unit: unmappedSurcharge,
                      display_type: false,
                      product_uom: odooServiceInfo.uom_id || false,
                      tax_id: odooServiceInfo.tax_id || false,
                    },
                  ])
                  console.log(`   💰 Ligne options globale ajoutée: ${unmappedSurcharge.toFixed(2)}€ HT (${unmappedOptionNames.join(', ')})`)
                }
              } else if (mappedOptionsTotal === 0) {
                // Aucune option n'avait de mapping, créer une ligne globale avec le total
                const optionNames = selectedOptions.map((optId: string) => {
                  const option = (pricing as any)?.options?.find((opt: any) => opt.id === optId)
                  return option ? option.name : optId
                }).join(', ')
                
                orderLines.push([
                  0,
                  0,
                  {
                    name: `Options sérigraphie: ${optionNames}`,
                    product_id: odooServiceInfo.id,
                    product_uom_qty: 1,
                    price_unit: priceBreakdown.optionsSurcharge,
                    display_type: false,
                    product_uom: odooServiceInfo.uom_id || false,
                    tax_id: odooServiceInfo.tax_id || false,
                  },
                ])
                console.log(`   💰 Ligne options globale ajoutée: ${priceBreakdown.optionsSurcharge.toFixed(2)}€ HT`)
              }
            }
          }
        }
      }
    }
    
    // ÉTAPE 3: Créer les lignes pour les frais de livraison et options
    // Réutiliser pricingConfig déjà chargé au début
    
    // Calculer les quantités totales pour les calculs
    const totalQuantity = quote.items.reduce((total, item) => {
      return total + item.colorQuantities.reduce((sum, cq) => {
        return sum + cq.quantities.reduce((s, q) => s + q.quantity, 0)
      }, 0)
    }, 0)
    
    // Frais de port et méthode de livraison - toujours ajouter comme ligne de produit
    // Charger le mapping depuis la base de données
    const { getOdooProductCodeForDelivery } = await import('./delivery-odoo-mapping-db')
    const deliveryProductCode = await getOdooProductCodeForDelivery(quote.delivery.type)
    
    // Mapping des noms pour l'affichage
    const deliveryProductNameMapping: Record<string, string> = {
      'pickup': 'Pick-UP',
      'dpd': 'Livraison via DPD',
      'client_carrier': 'Transporteur du client',
      'courier': 'Livraison coursier',
    }
    const deliveryProductName = deliveryProductNameMapping[quote.delivery.type] || `Livraison ${quote.delivery.type}`
    
    // Chercher le produit Odoo pour la livraison par référence interne (default_code)
    let deliveryProductId: number | null = null
    let deliveryUomId: any = false
    let deliveryTaxId: any = false
    let deliveryPrice = 0
    
    try {
      // Calculer les frais seulement pour DPD et Coursier
      if (quote.delivery.type === 'dpd') {
        // Pour DPD, utiliser le calcul par cartons
        deliveryPrice = calculateShippingCostSync(selectedProductsForShipping)
      } else if (quote.delivery.type === 'courier' && quote.delivery.address) {
        // Pour le coursier, calculer selon la distance
        const { calculateDistanceToWarehouse } = await import('./distance')
        try {
          const result = await calculateDistanceToWarehouse(quote.delivery.address)
          if (result.distance > 0 && !result.error) {
            const pricePerKm = pricingConfig.courierPricePerKm || 1.50
            const minimumFee = pricingConfig.courierMinimumFee || 15.00
            const calculatedPrice = result.distance * pricePerKm
            deliveryPrice = Math.max(calculatedPrice, minimumFee)
          } else {
            // En cas d'erreur, utiliser le forfait minimum
            deliveryPrice = pricingConfig.courierMinimumFee || 15.00
          }
        } catch (error) {
          console.error('Erreur calcul frais coursier:', error)
          deliveryPrice = pricingConfig.courierMinimumFee || 15.00
        }
      }
      
      // Chercher le produit Odoo par référence interne (default_code) pour éviter les faux positifs
      // deliveryProductCode peut être null si le mapping n'existe pas dans la DB
      if (deliveryProductCode && deliveryProductCode.trim() !== '') {
        console.log(`🔍 Recherche du produit de livraison par référence interne: "${deliveryProductCode}"`)
        
        // Essayer d'abord avec les filtres stricts (type service, sale_ok)
        let searchRequest = {
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
              'search_read',
              [
                [
                  ['default_code', '=', deliveryProductCode.trim()],
                  ['sale_ok', '=', true],
                  ['type', '=', 'service'], // S'assurer que c'est un produit de service
                ],
              ],
              {
                fields: ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'type', 'sale_ok'],
                limit: 1,
              },
            ],
          },
        }
        
        let searchResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchRequest),
        })
        
        let searchData = await searchResponse.json()
        
        // Si pas trouvé avec les filtres stricts, essayer sans le filtre type
        if (!searchData.result || searchData.result.length === 0) {
          console.log(`⚠️ Produit non trouvé avec filtres stricts, recherche sans filtre type...`)
          searchRequest = {
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
                'search_read',
                [
                  [
                    ['default_code', '=', deliveryProductCode.trim()],
                    ['sale_ok', '=', true],
                  ],
                ],
                {
                  fields: ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'type', 'sale_ok'],
                  limit: 5, // Augmenter pour voir tous les résultats
                },
              ],
            },
          }
          
          searchResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchRequest),
          })
          
          searchData = await searchResponse.json()
        }
        
        if (searchData.result && searchData.result.length > 0) {
          // Afficher tous les résultats trouvés pour déboguer
          console.log(`📦 ${searchData.result.length} produit(s) trouvé(s) avec la référence "${deliveryProductCode}":`)
          searchData.result.forEach((p: any, idx: number) => {
            console.log(`   ${idx + 1}. "${p.name}" (ID: ${p.id}, Réf: ${p.default_code || 'N/A'}, Type: ${p.type || 'N/A'}, Sale OK: ${p.sale_ok || false})`)
          })
          
          const product = searchData.result[0]
          
          // Vérifier que le produit trouvé correspond bien à ce qu'on cherche
          // Si le nom contient des mots-clés non liés à la livraison, c'est probablement le mauvais produit
          const productNameLower = product.name.toLowerCase()
          const suspiciousKeywords = ['magnetica', 'tool', 'torch', 'light']
          const isSuspicious = suspiciousKeywords.some(keyword => productNameLower.includes(keyword))
          
          if (isSuspicious) {
            console.log(`⚠️ Produit suspect trouvé: "${product.name}" - Ce produit ne semble pas être un produit de livraison`)
            console.log(`   → Référence recherchée: "${deliveryProductCode}"`)
            console.log(`   → Référence trouvée: "${product.default_code || 'N/A'}"`)
            console.log(`   → Ignoré, création d'une ligne de livraison sans produit associé`)
          } else {
            deliveryProductId = product.id
            
            // Format des UOM et taxes
            deliveryUomId = product.uom_id && Array.isArray(product.uom_id) ? product.uom_id[0] : false
            if (product.taxes_id && Array.isArray(product.taxes_id) && product.taxes_id.length > 0) {
              const taxIds = product.taxes_id
              deliveryTaxId = [[6, 0, taxIds]]
            } else {
              deliveryTaxId = false
            }
            
            console.log(`✅ Produit Odoo sélectionné pour livraison: "${product.name}" (ID: ${deliveryProductId}, Réf: ${product.default_code || 'N/A'}, Type: ${product.type || 'N/A'})`)
          }
        } else {
          console.log(`⚠️ Produit Odoo avec référence "${deliveryProductCode}" non trouvé dans Odoo`)
          console.log(`   → Vérifiez que le produit existe dans Odoo avec la référence interne exacte: "${deliveryProductCode}"`)
          console.log(`   → Vérifiez que le produit a sale_ok = true`)
          console.log(`   → Création d'une ligne de livraison sans produit associé`)
        }
      } else {
        // Si pas de code de référence configuré, ne pas chercher (évite les faux positifs)
        console.log(`⚠️ Aucune référence interne configurée pour le type de livraison "${quote.delivery.type}"`)
        console.log(`   → Création d'une ligne de livraison sans produit associé`)
      }
    } catch (error) {
      console.warn(`⚠️ Erreur lors de la recherche du produit de livraison:`, error)
    }
    
    // Ajouter la ligne de livraison (même si le prix est 0, pour avoir la méthode dans la commande)
    let deliveryLabel = deliveryProductName
    if (quote.delivery.type === 'dpd' || quote.delivery.type === 'courier') {
      // Utiliser la fonction préchargée
      const cartonsCount = calculateCartons(selectedProductsForShipping)
      deliveryLabel = `Frais de port (${cartonsCount} carton${cartonsCount > 1 ? 's' : ''})`
    }
    
    const deliveryLineData: any = {
      name: deliveryLabel,
    }
    
    if (deliveryProductId) {
      // Ligne comptable avec produit
      deliveryLineData.product_id = deliveryProductId
      deliveryLineData.price_unit = deliveryPrice
      deliveryLineData.product_uom_qty = 1
      deliveryLineData.display_type = false // Ligne comptable
      
      if (deliveryUomId !== false) {
        deliveryLineData.product_uom = deliveryUomId
      }
      if (deliveryTaxId !== false) {
        deliveryLineData.tax_id = deliveryTaxId
      }
      
      console.log(`✅ Ligne livraison ajoutée (comptable): ${deliveryLabel} - ${deliveryPrice.toFixed(2)}€ HT (Produit ID: ${deliveryProductId})`)
    } else {
      // Ligne de note si le produit n'est pas trouvé (pour éviter l'erreur de contrainte)
      deliveryLineData.display_type = 'line_note'
      deliveryLineData.name = `${deliveryLabel} - ${deliveryPrice.toFixed(2)}€ HT (Produit Odoo non trouvé: ${deliveryProductCode || 'N/A'})`
      console.log(`⚠️ Ligne livraison ajoutée (note): ${deliveryLabel} - ${deliveryPrice.toFixed(2)}€ HT (Produit Odoo non trouvé, référence: ${deliveryProductCode || 'N/A'})`)
    }
    
    orderLines.push([0, 0, deliveryLineData])
    
    // Emballage individuel
    if (quote.delivery.individualPackaging && pricingConfig.individualPackagingPrice > 0) {
      const packagingCost = totalQuantity * pricingConfig.individualPackagingPrice
      
      // Chercher le produit Odoo pour l'emballage individuel
      const { getOdooProductCodeForOption } = await import('./option-odoo-mapping-db')
      const packagingProductCode = await getOdooProductCodeForOption('individualPackaging')
      
      let packagingProductId: number | null = null
      let packagingUomId: any = false
      let packagingTaxId: any = false
      
      if (packagingProductCode) {
        try {
          const searchRequest = {
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
                'search_read',
                [
                  [
                    ['default_code', '=', packagingProductCode],
                    ['sale_ok', '=', true],
                    ['type', '=', 'service'],
                  ],
                ],
                {
                  fields: ['id', 'name', 'default_code', 'uom_id', 'uom_po_id', 'taxes_id', 'type'],
                  limit: 1,
                },
              ],
            },
          }
          
          const searchResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchRequest),
          })
          
          const searchData = await searchResponse.json()
          
          if (searchData.result && searchData.result.length > 0) {
            const product = searchData.result[0]
            packagingProductId = product.id
            packagingUomId = product.uom_id && Array.isArray(product.uom_id) ? product.uom_id[0] : false
            if (product.taxes_id && Array.isArray(product.taxes_id) && product.taxes_id.length > 0) {
              const taxIds = product.taxes_id
              packagingTaxId = [[6, 0, taxIds]]
            } else {
              packagingTaxId = false
            }
            console.log(`✅ Produit Odoo trouvé pour emballage individuel: "${product.name}" (ID: ${packagingProductId})`)
          }
        } catch (error) {
          console.warn(`⚠️ Erreur lors de la recherche du produit emballage individuel:`, error)
        }
      }
      
      const packagingLineData: any = {
        name: `Emballage individuel (${totalQuantity} pièce${totalQuantity > 1 ? 's' : ''})`,
      }
      
      if (packagingProductId) {
        packagingLineData.product_id = packagingProductId
        packagingLineData.price_unit = packagingCost
        packagingLineData.product_uom_qty = 1
        packagingLineData.display_type = false // Ligne comptable
        
        if (packagingUomId !== false) {
          packagingLineData.product_uom = packagingUomId
        }
        if (packagingTaxId !== false) {
          packagingLineData.tax_id = packagingTaxId
        }
        
        console.log(`✅ Ligne emballage individuel ajoutée (comptable): ${packagingCost.toFixed(2)}€ HT (Produit ID: ${packagingProductId})`)
      } else {
        packagingLineData.display_type = 'line_note'
        packagingLineData.name = `Emballage individuel (${totalQuantity} pièce${totalQuantity > 1 ? 's' : ''}) - ${packagingCost.toFixed(2)}€ HT (Produit Odoo non trouvé: ${packagingProductCode || 'N/A'})`
        console.log(`⚠️ Ligne emballage individuel ajoutée (note): ${packagingCost.toFixed(2)}€ HT (Produit Odoo non trouvé, référence: ${packagingProductCode || 'N/A'})`)
      }
      
      orderLines.push([0, 0, packagingLineData])
    }
    
    // Cartons neufs (utiliser la fonction préchargée)
    if (quote.delivery.newCarton && pricingConfig.newCartonPrice > 0) {
      const cartonsCount = calculateCartons(selectedProductsForShipping)
      const cartonCost = cartonsCount * pricingConfig.newCartonPrice
      
      // Chercher le produit Odoo pour les cartons neufs
      const { getOdooProductCodeForOption } = await import('./option-odoo-mapping-db')
      const cartonProductCode = await getOdooProductCodeForOption('newCarton')
      
      let cartonProductId: number | null = null
      let cartonUomId: any = false
      let cartonTaxId: any = false
      
      if (cartonProductCode && cartonProductCode.trim() !== '') {
        const productInfo: any = await findOdooProductByCode(cartonProductCode, auth)
        if (productInfo) {
          cartonProductId = productInfo.id
          cartonUomId = productInfo.uom_id || false
          if (productInfo.taxes_id && productInfo.taxes_id.length > 0) {
            cartonTaxId = [[6, 0, productInfo.taxes_id]]
          } else {
            cartonTaxId = false
          }
          console.log(`✅ Produit Odoo trouvé pour cartons neufs: "${productInfo.name}" (ID: ${cartonProductId}, Réf: ${productInfo.default_code || 'N/A'}, Type: ${productInfo.type || 'N/A'})`)
        }
      }
      
      const cartonLineData: any = {
        name: `Carton${cartonsCount > 1 ? 's' : ''} neuf${cartonsCount > 1 ? 's' : ''} (${cartonsCount})`,
      }
      
      if (cartonProductId) {
        cartonLineData.product_id = cartonProductId
        cartonLineData.price_unit = cartonCost
        cartonLineData.product_uom_qty = 1
        cartonLineData.display_type = false // Ligne comptable
        
        if (cartonUomId !== false) {
          cartonLineData.product_uom = cartonUomId
        }
        if (cartonTaxId !== false) {
          cartonLineData.tax_id = cartonTaxId
        }
        
        console.log(`✅ Ligne cartons neufs ajoutée (comptable): ${cartonCost.toFixed(2)}€ HT (${cartonsCount} carton${cartonsCount > 1 ? 's' : ''}, Produit ID: ${cartonProductId})`)
      } else {
        cartonLineData.display_type = 'line_note'
        cartonLineData.name = `Carton${cartonsCount > 1 ? 's' : ''} neuf${cartonsCount > 1 ? 's' : ''} (${cartonsCount}) - ${cartonCost.toFixed(2)}€ HT (Produit Odoo non trouvé: ${cartonProductCode || 'N/A'})`
        console.log(`⚠️ Ligne cartons neufs ajoutée (note): ${cartonCost.toFixed(2)}€ HT (${cartonsCount} carton${cartonsCount > 1 ? 's' : ''}, Produit Odoo non trouvé, référence: ${cartonProductCode || 'N/A'})`)
      }
      
      orderLines.push([0, 0, cartonLineData])
    }
    
    // Vectorisation des logos
    // Note: On compte les items avec fichiers comme indicateur de vectorisation
    // Pour une gestion plus précise, ajouter un champ vectorization à QuoteItem
    if (pricingConfig.vectorizationPrice > 0) {
      const vectorizationCount = quote.items.filter(item => 
        item.files && item.files.length > 0
      ).length
      
      if (vectorizationCount > 0) {
        const vectorizationCost = vectorizationCount * pricingConfig.vectorizationPrice
        
        orderLines.push([
          0,
          0,
          {
            name: `Vectorisation logo${vectorizationCount > 1 ? 's' : ''} (${vectorizationCount} fichier${vectorizationCount > 1 ? 's' : ''}) - ${vectorizationCost.toFixed(2)}€ HT`,
            display_type: 'line_note', // Ligne de note car pas de produit Odoo associé
          },
        ])
        console.log(`✅ Ligne vectorisation ajoutée (note): ${vectorizationCost.toFixed(2)}€ HT (${vectorizationCount} fichier${vectorizationCount > 1 ? 's' : ''})`)
      }
    }
    
    console.log(`✅ ${orderLines.length} ligne(s) de commande préparée(s) (produits + services + livraison)`)

    // Construire la note du devis
    const delayDays = quote.delay.isExpress && quote.delay.expressDays !== undefined 
      ? quote.delay.expressDays 
      : quote.delay.workingDays
    // Déterminer le libellé de livraison selon le type pour la note
    const deliveryLabelsForNote: Record<string, string> = {
      'pickup': 'Pick-UP',
      'dpd': 'Livraison via DPD',
      'client_carrier': 'Transporteur du client',
      'courier': 'Coursier en direct',
    }
    const deliveryLabelForNote = deliveryLabelsForNote[quote.delivery.type] || quote.delivery.type
    
    const noteParts = [
      `Délai: ${quote.delay.type} (${delayDays} jours)`,
      `Livraison: ${deliveryLabelForNote}`,
      (quote.delivery.type === 'dpd' || quote.delivery.type === 'courier') && quote.delivery.address
        ? `Adresse de livraison: ${quote.delivery.address.street}, ${quote.delivery.address.postalCode} ${quote.delivery.address.city}, ${quote.delivery.address.country}`
        : '',
      // Note: L'adresse de facturation est automatiquement celle du partner Odoo (partner_id)
      // Pas besoin de l'ajouter dans les notes car Odoo l'utilise automatiquement
      quote.clientInfo
        ? [
            `Client: ${quote.clientInfo.name}`,
            `Email: ${quote.clientInfo.email}`,
            quote.clientInfo.company ? `Entreprise: ${quote.clientInfo.company}` : '',
            quote.clientInfo.phone ? `Téléphone: ${quote.clientInfo.phone}` : '',
          ].filter(Boolean).join('\n')
        : '',
    ]

    // Ajouter les fichiers dans les notes avec plus de détails
    if (allFiles.length > 0) {
      noteParts.push(
        '',
        '════════════════════════════════════════',
        '📎 FICHIERS UPLOADÉS PAR LE CLIENT',
        '════════════════════════════════════════',
        '',
        ...allFiles.map((file, index) => {
          let fileInfo = `Fichier ${index + 1}: ${file.name}`
          if (file.size) {
            fileInfo += ` ${file.size}`
          }
          fileInfo += `\n  → Marquage: ${file.marking}`
          if (file.url) {
            fileInfo += `\n  → URL: ${file.url}`
          }
          return fileInfo
        }),
        '',
        `Total: ${allFiles.length} fichier${allFiles.length > 1 ? 's' : ''} uploadé${allFiles.length > 1 ? 's' : ''}`
      )
    }

    const note = noteParts.filter(Boolean).join('\n\n')

    // Calculer la date de production (date de livraison)
    const productionDate = getDeliveryDate(quote.delay)
    const productionDateStr = productionDate.toISOString().split('T')[0] // Format YYYY-MM-DD pour Odoo
    console.log(`📅 Date de production calculée: ${productionDateStr}`)

    // Calculer order_speed selon le délai
    // Normal = 10 jours ouvrables
    // Imperative (X days) si < 10 jours
    const workingDays = quote.delay.isExpress && quote.delay.expressDays !== undefined
      ? Math.max(1, Math.ceil(quote.delay.expressDays))
      : quote.delay.workingDays
    const orderSpeed = workingDays >= 10 ? 'Normal' : `Imperative (${workingDays} days)`
    console.log(`⚡ Vitesse de commande: ${orderSpeed} (${workingDays} jours ouvrables)`)

    // Mapper la méthode de livraison
    // Dans Odoo, la livraison est souvent gérée via delivery_type ou un transporteur (carrier)
    // Pour l'instant, on cherche un transporteur par nom, sinon on utilise delivery_type
    let deliveryMethodId: number | null = null
    const deliveryMapping: Record<string, string> = {
      'pickup': 'Pick-UP',
      'dpd': 'DPD',
      'client_carrier': 'Transporteur du client',
      'courier': 'Coursier',
    }
    const deliveryCarrierName = deliveryMapping[quote.delivery.type] || quote.delivery.type

    // Rechercher le transporteur dans Odoo si nécessaire
    try {
      const carrierSearchRequest = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            ODOO_DB,
            auth.uid,
            auth.password,
            'delivery.carrier',
            'search_read',
            [
              [['name', 'ilike', deliveryCarrierName]],
            ],
            {
              fields: ['id', 'name'],
              limit: 1,
            },
          ],
        },
      }

      const carrierResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carrierSearchRequest),
      })

      const carrierData = await carrierResponse.json()
      if (carrierData.result && carrierData.result.length > 0) {
        deliveryMethodId = carrierData.result[0].id
        console.log(`✅ Transporteur trouvé: "${deliveryCarrierName}" (ID: ${deliveryMethodId})`)
      } else {
        console.log(`ℹ️ Transporteur "${deliveryCarrierName}" non trouvé dans Odoo, utilisation de delivery_type`)
      }
    } catch (error) {
      console.warn(`⚠️ Erreur lors de la recherche du transporteur:`, error)
    }

    // Calculer le total des pièces
    const totalPieces = quote.items.reduce((total, item) => {
      return total + item.colorQuantities.reduce((itemTotal, cq) => {
        return itemTotal + cq.quantities.reduce((sum, q) => sum + q.quantity, 0)
      }, 0)
    }, 0)
    
    console.log(`📊 Total des pièces calculé: ${totalPieces}`)

    // Créer le devis dans Odoo avec execute_kw
    const saleOrderData: any = {
      partner_id: partnerId, // ID du client connecté
      order_line: orderLines,
      note: note,
    }
    
    // Ajouter le titre dans le champ title si présent
    if (quote.title) {
      saleOrderData.title = quote.title
    }
    
    // Ajouter le total des pièces dans le champ x_total_pieces (champ personnalisé Odoo)
    saleOrderData.x_total_pieces = totalPieces

    // Ne pas ajouter production_date et order_speed ici car ils peuvent causer une erreur
    // Ces champs seront ajoutés après la création via write() si nécessaire

    // Ajouter le transporteur si trouvé
    if (deliveryMethodId) {
      saleOrderData.carrier_id = deliveryMethodId
      console.log(`✅ Transporteur ajouté à la commande: ${deliveryMethodId}`)
    } else {
      // Ne pas utiliser delivery_type car ce champ peut ne pas exister dans sale.order
      // La livraison sera gérée via carrier_id ou dans les notes
      console.log(`ℹ️ Aucun transporteur trouvé, informations de livraison dans les notes`)
    }
    
    // Ne pas inclure state dans create, Odoo le définit automatiquement
    // state sera 'draft' par défaut

    console.log('📤 Données du devis à créer:', {
      partner_id: partnerId,
      order_line_count: orderLines.length,
      note_length: note.length,
      total_pieces: totalPieces,
      production_date: productionDateStr,
      order_speed: orderSpeed,
      delivery_method: deliveryMethodId ? `ID: ${deliveryMethodId}` : 'Dans les notes',
    })

    const requestBody = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          auth.uid,
          auth.password,
          'sale.order',
          'create',
          [saleOrderData],
        ],
      },
    }

    console.log('📤 Envoi de la requête à Odoo...')
    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    console.log('📥 Réponse Odoo:', {
      hasError: !!data.error,
      hasResult: !!data.result,
      error: data.error ? JSON.stringify(data.error, null, 2) : null,
    })

    if (data.error) {
      console.error('❌ Erreur Odoo complète:', JSON.stringify(data.error, null, 2))
      const errorMessage = data.error.message || data.error.data?.message || JSON.stringify(data.error)
      
      // Si l'erreur est liée à un champ inexistant ou à un type incorrect, essayer sans les champs personnalisés
      const errorStr = JSON.stringify(data.error).toLowerCase()
      if (errorStr.includes('production_date') || errorStr.includes('order_speed') || errorStr.includes('does not exist') || errorStr.includes('field') || errorStr.includes('invalid input syntax') || errorStr.includes('invalidtextrepresentation')) {
        console.log('⚠️ Erreur liée à un champ personnalisé (type incorrect ou inexistant), tentative sans production_date et order_speed...')
        
        // Créer une copie sans les champs problématiques
        const saleOrderDataWithoutCustomFields = {
          ...saleOrderData,
        }
        delete saleOrderDataWithoutCustomFields.production_date
        delete saleOrderDataWithoutCustomFields.order_speed
        
        // Réessayer la création
        const retryRequestBody = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              ODOO_DB,
              auth.uid,
              auth.password,
              'sale.order',
              'create',
              [saleOrderDataWithoutCustomFields],
            ],
          },
        }

        const retryResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryRequestBody),
        })

        const retryData = await retryResponse.json()
        
        if (retryData.error) {
          console.error('❌ Erreur Odoo après retry:', JSON.stringify(retryData.error, null, 2))
          const retryErrorMessage = retryData.error.message || retryData.error.data?.message || JSON.stringify(retryData.error)
          return { success: false, error: retryErrorMessage }
        }
        
        if (retryData.result) {
          console.log('✅ Devis créé dans Odoo (ID:', retryData.result, ')')
          // Essayer d'ajouter production_date et DELIVERY via write() après la création
          await updateOrderFieldsAfterCreation(retryData.result, auth, productionDateStr, orderSpeed, quote.delivery.type)
          return { success: true, quoteId: retryData.result.toString() }
        }
      }
      
      return { success: false, error: errorMessage }
    }

    if (!data.result) {
      console.error('❌ Aucun résultat retourné par Odoo')
      return { success: false, error: 'Aucun résultat retourné par Odoo' }
    }

    console.log('✅ Devis créé dans Odoo avec l\'ID:', data.result)

    // Essayer d'ajouter production_date et DELIVERY via write() après la création
    await updateOrderFieldsAfterCreation(data.result, auth, productionDateStr, orderSpeed, quote.delivery.type)

    return { success: true, quoteId: data.result.toString() }
  } catch (error) {
    console.error('Erreur lors de la création du devis dans Odoo:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

/**
 * Alternative: Utilisation de l'API REST d'Odoo (si disponible)
 */
export async function createQuoteInOdooREST(quote: Quote): Promise<{ success: boolean; quoteId?: string; error?: string }> {
  try {
    // Cette fonction utilise l'API REST d'Odoo si elle est configurée
    // Format de l'URL: ${ODOO_URL}/api/sale.order
    
    const orderLines = quote.items.map(item => {
      const totalQuantity = item.colorQuantities.reduce((total, cq) => {
        return total + cq.quantities.reduce((sum, q) => sum + q.quantity, 0)
      }, 0)

      return {
        product_id: false,
        name: `${item.product.name} - ${item.technique}`,
        product_uom_qty: totalQuantity,
        price_unit: 0,
      }
    })

    const response = await fetch(`${ODOO_URL}/api/sale.order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${ODOO_USERNAME}:${ODOO_PASSWORD}`).toString('base64')}`,
      },
      body: JSON.stringify({
        partner_id: false,
        order_line: orderLines,
        note: `Délai: ${quote.delay.type}, Livraison: ${quote.delivery.type}`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.error || 'Erreur lors de la création du devis' }
    }

    const data = await response.json()
    return { success: true, quoteId: data.id?.toString() }
  } catch (error) {
    console.error('Erreur lors de la création du devis dans Odoo (REST):', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

