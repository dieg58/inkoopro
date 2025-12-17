import { Quote } from '@/types'
import { TEXTILE_DISCOUNT_PERCENTAGE } from './data'

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
    
    // Essayer d'abord une recherche exacte
    let searchCriteria: any[] = [['name', '=', productName]]
    
    const searchProduct = async (criteria: any[]): Promise<any> => {
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
                ? ['id', 'name', 'uom_id', 'uom_po_id', 'taxes_id', 'list_price']
                : ['id', 'name', 'uom_id', 'uom_po_id', 'taxes_id'],
              limit: 10, // Augmenter la limite pour voir tous les résultats possibles
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
        console.error(`❌ Erreur lors de la recherche du produit "${productName}":`, data.error)
        return null
      }

      return data.result || []
    }

    // Essayer recherche exacte
    let products = await searchProduct([['name', '=', productName]])
    
    // Si pas de résultat, essayer recherche insensible à la casse
    if (!products || products.length === 0) {
      console.log(`   ⚠️ Recherche exacte échouée, tentative avec recherche insensible à la casse...`)
      products = await searchProduct([['name', 'ilike', productName]])
    }
    
    // Si toujours pas de résultat, essayer recherche partielle
    if (!products || products.length === 0) {
      console.log(`   ⚠️ Recherche insensible à la casse échouée, tentative avec recherche partielle...`)
      products = await searchProduct([['name', 'like', productName]])
    }

    // Afficher tous les produits trouvés pour déboguer
    if (products && products.length > 0) {
      console.log(`   📦 ${products.length} produit(s) trouvé(s):`)
      products.forEach((p: any, idx: number) => {
        console.log(`      ${idx + 1}. "${p.name}" (ID: ${p.id})`)
      })
      
      // Prendre le premier produit qui correspond exactement (insensible à la casse)
      let product = products.find((p: any) => p.name.toLowerCase() === productName.toLowerCase())
      
      // Si pas de correspondance exacte, prendre le premier
      if (!product && products.length > 0) {
        product = products[0]
        console.log(`   ⚠️ Aucune correspondance exacte, utilisation du premier résultat: "${product.name}"`)
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
        console.log(`✅ Produit trouvé: "${product.name}" (ID: ${productInfo.id}, UOM: ${productInfo.uom_id}, Taxes: ${productInfo.tax_id ? 'oui' : 'non'})`)
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

    // Préparer les lignes de commande
    const orderLines: any[] = []
    const allFiles: Array<{ name: string; marking: string }> = [] // Collecter tous les fichiers pour les notes
    
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

              orderLines.push([0, 0, textileLineData])
              console.log(`✅ Ligne produit textile créée: ${item.product.name} - ${colorQuantity.color} - ${sizeQuantity.size} (ID: ${textileVariant.id})`)
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
          odooServiceInfo = await findOdooProductByName(odooProductName, auth, item.clientProvided)
          if (!odooServiceInfo) {
            console.warn(`⚠️ Produit service Odoo "${odooProductName}" non trouvé - ligne de note uniquement`)
          }
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
          
          // Si le client fournit le produit, appliquer l'indexation sur le prix du service
          if (item.clientProvided && odooServiceInfo.list_price) {
            const { loadPricingConfig } = await import('./pricing-config-db')
            const pricingConfig = await loadPricingConfig()
            const basePrice = odooServiceInfo.list_price
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
      }
    }
    
    console.log(`✅ ${orderLines.length} ligne(s) de commande préparée(s)`)

    // Construire la note du devis
    const delayDays = quote.delay.isExpress && quote.delay.expressDays !== undefined 
      ? quote.delay.expressDays 
      : quote.delay.workingDays
    const noteParts = [
      `Délai: ${quote.delay.type} (${delayDays} jours)`,
      `Livraison: ${quote.delivery.type}`,
      quote.delivery.type === 'livraison' && quote.delivery.address
        ? `Adresse de livraison: ${quote.delivery.address.street}, ${quote.delivery.address.postalCode} ${quote.delivery.address.city}, ${quote.delivery.address.country}`
        : 'Retrait sur place',
      quote.delivery.billingAddressDifferent && quote.delivery.billingAddress
        ? `Adresse de facturation: ${quote.delivery.billingAddress.street}, ${quote.delivery.billingAddress.postalCode} ${quote.delivery.billingAddress.city}, ${quote.delivery.billingAddress.country}`
        : '',
      quote.clientInfo
        ? [
            `Client: ${quote.clientInfo.name}`,
            `Email: ${quote.clientInfo.email}`,
            quote.clientInfo.company ? `Entreprise: ${quote.clientInfo.company}` : '',
            quote.clientInfo.phone ? `Téléphone: ${quote.clientInfo.phone}` : '',
          ].filter(Boolean).join('\n')
        : '',
    ]

    // Ajouter les fichiers dans les notes
    if (allFiles.length > 0) {
      noteParts.push(
        '',
        '📎 FICHIERS UPLOADÉS:',
        ...allFiles.map(file => `  - ${file.name} (${file.marking})`)
      )
    }

    const note = noteParts.filter(Boolean).join('\n\n')

    // Créer le devis dans Odoo avec execute_kw
    const saleOrderData: any = {
      partner_id: partnerId, // ID du client connecté
      order_line: orderLines,
      note: note,
    }
    
    // Ne pas inclure state dans create, Odoo le définit automatiquement
    // state sera 'draft' par défaut

    console.log('📤 Données du devis à créer:', {
      partner_id: partnerId,
      order_line_count: orderLines.length,
      note_length: note.length,
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
      return { success: false, error: errorMessage }
    }

    if (!data.result) {
      console.error('❌ Aucun résultat retourné par Odoo')
      return { success: false, error: 'Aucun résultat retourné par Odoo' }
    }

    console.log('✅ Devis créé dans Odoo avec l\'ID:', data.result)

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

