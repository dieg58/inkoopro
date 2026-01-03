import { OdooClient } from './odoo-auth'

/**
 * Configuration Odoo
 */
const ODOO_URL = process.env.NEXT_PUBLIC_ODOO_URL || ''
const ODOO_DB = process.env.NEXT_PUBLIC_ODOO_DB || ''
const ODOO_USERNAME = process.env.NEXT_PUBLIC_ODOO_USERNAME || ''
const ODOO_PASSWORD = process.env.NEXT_PUBLIC_ODOO_PASSWORD || ''

/**
 * Interface pour une commande Odoo
 */
export interface OdooOrder {
  id: number
  name: string // Numéro de commande (ex: SO001)
  date_order: string // Date de commande
  state: string // État: draft, sent, sale, done, cancel
  amount_total: number // Montant total
  partner_id: [number, string] // [ID, Nom du client]
  order_line: number[] // IDs des lignes de commande
  note?: string // Notes
  create_date: string // Date de création
  write_date: string // Date de modification
  project_id?: [number, string] | false // [ID, Nom] du projet lié
  stage_id?: [number, string] | false // [ID, Nom] de l'étape du projet (project.project.stage)
  title?: string // Titre de la commande (depuis sale.order.title)
  project_state?: string // Nom de l'étape du projet (depuis stage_id[1])
  picking_ids?: number[] // IDs des pickings (bon de livraison)
  delivery_state?: string // Statut de livraison (récupéré depuis les pickings)
}

/**
 * Interface pour une ligne de commande
 */
export interface OdooOrderLine {
  id: number
  product_id: [number, string] | false // [ID, Nom] ou false si pas de produit
  name: string // Description
  product_uom_qty: number // Quantité
  price_unit: number // Prix unitaire
  price_subtotal: number // Sous-total
  product_no_variant_attribute_value_ids?: number[] // IDs des valeurs d'attributs (tailles, couleurs)
  sizes?: string[] // Tailles extraites des attributs
}

/**
 * Authentification Odoo
 */
async function authenticateOdoo(): Promise<{ uid: number; password: string } | null> {
  try {
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
    if (data.result && data.result.uid) {
      return {
        uid: data.result.uid,
        password: ODOO_PASSWORD,
      }
    }
    return null
  } catch (error) {
    console.error('Erreur d\'authentification Odoo:', error)
    return null
  }
}

/**
 * Récupère toutes les commandes d'un client depuis Odoo
 */
export async function getClientOrders(client: OdooClient): Promise<OdooOrder[]> {
  try {
    const auth = await authenticateOdoo()
    if (!auth) {
      console.error('❌ Échec de l\'authentification Odoo')
      return []
    }

    console.log('📦 Récupération des commandes pour le client:', client.name, '(Partner ID:', client.partnerId, ', Email:', client.email, ')')

    // D'abord, récupérer tous les partenaires avec le même email (compte principal + comptes de livraison)
    const partnerSearchRequest = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          auth.uid,
          auth.password,
          'res.partner',
          'search',
          [[['email', '=', client.email]]],
        ],
      },
    }

    const partnerSearchResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partnerSearchRequest),
    })

    const partnerSearchData = await partnerSearchResponse.json()
    let partnerIds: number[] = [client.partnerId] // Inclure au minimum le partenaire principal

    if (!partnerSearchData.error && partnerSearchData.result && partnerSearchData.result.length > 0) {
      partnerIds = partnerSearchData.result
      console.log(`✅ ${partnerIds.length} partenaire(s) trouvé(s) avec l'email ${client.email}:`, partnerIds)
    } else {
      console.log('⚠️  Aucun autre partenaire trouvé avec le même email, utilisation du partenaire principal uniquement')
    }

    // Rechercher les commandes pour tous les partenaires avec le même email
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
          'sale.order',
          'search_read',
          [[['partner_id', 'in', partnerIds]]],
          {
            fields: [
              'id',
              'name',
              'title',
              'date_order',
              'state',
              'amount_total',
              'partner_id',
              'order_line',
              'note',
              'create_date',
              'write_date',
              'project_id',
              'picking_ids',
            ],
            order: 'date_order desc', // Plus récentes en premier
            limit: 100, // Limite de 100 commandes
          },
        ],
      },
    }

    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    })

    const data = await response.json()

    if (data.error) {
      console.error('❌ Erreur lors de la récupération des commandes:', data.error)
      return []
    }

    const orders = data.result || []
    console.log(`✅ ${orders.length} commande(s) trouvée(s) pour le client`)
    if (orders.length > 0) {
      console.log('📋 Première commande:', { id: orders[0].id, name: orders[0].name, project_id: orders[0].project_id })
    }

    // Si aucune commande, retourner directement
    if (orders.length === 0) {
      return []
    }

    // Enrichir les commandes avec le titre depuis sale.order.title et l'étape depuis stage_id
    // Utiliser Promise.allSettled pour ne pas faire échouer toute la fonction si une commande échoue
    try {
      // Enrichir chaque commande
      const enrichedOrdersPromises = orders.map(async (order: OdooOrder) => {
        // Le titre vient directement de sale.order.title (déjà récupéré)
        const title = order.title

        // L'étape du projet vient de stage_id du projet lié (project.project.stage_id)
        // Il faut d'abord récupérer le projet, puis son stage_id
        let projectState: string | undefined
        if (order.project_id && Array.isArray(order.project_id) && order.project_id[0]) {
          try {
            // Récupérer le stage_id depuis le projet
            const projectRequest = {
              jsonrpc: '2.0',
              method: 'call',
              params: {
                service: 'object',
                method: 'execute_kw',
                args: [
                  ODOO_DB,
                  auth.uid,
                  auth.password,
                  'project.project',
                  'read',
                  [[order.project_id[0]]],
                  {
                    fields: ['stage_id'],
                  },
                ],
              },
            }

            const projectResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(projectRequest),
            })

            const projectData = await projectResponse.json()
            if (projectData.result && projectData.result[0] && projectData.result[0].stage_id) {
              const stageId = projectData.result[0].stage_id
              // stage_id est un tuple [id, name], on utilise le name (nom de l'étape)
              if (Array.isArray(stageId) && stageId.length > 1) {
                projectState = stageId[1] // Le nom de l'étape
                console.log(`✅ Étape projet récupérée pour commande ${order.id}:`, projectState)
              } else if (Array.isArray(stageId) && stageId[0]) {
                // Si on n'a que l'ID, récupérer le nom depuis project.project.stage
                try {
                  const stageRequest = {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                      service: 'object',
                      method: 'execute_kw',
                      args: [
                        ODOO_DB,
                        auth.uid,
                        auth.password,
                        'project.project.stage',
                        'read',
                        [[stageId[0]]],
                        {
                          fields: ['name'],
                        },
                      ],
                    },
                  }

                  const stageResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(stageRequest),
                  })

                  const stageData = await stageResponse.json()
                  if (stageData.result && stageData.result[0]) {
                    projectState = stageData.result[0].name
                    console.log(`✅ Étape projet récupérée pour commande ${order.id}:`, projectState)
                  }
                } catch (error) {
                  console.warn(`⚠️  Impossible de récupérer le nom de l'étape pour la commande ${order.id}:`, error)
                }
              }
            }
          } catch (error) {
            console.warn(`⚠️  Impossible de récupérer l'étape du projet pour la commande ${order.id}:`, error)
          }
        }

        // Récupérer le statut de livraison depuis les pickings (out = livraison sortante)
        let deliveryState: string | undefined
        const pickingIds = order.picking_ids || []
        if (pickingIds.length > 0) {
          try {
            // Récupérer les pickings de type "out" (livraison)
            const pickingRequest = {
              jsonrpc: '2.0',
              method: 'call',
              params: {
                service: 'object',
                method: 'execute_kw',
                args: [
                  ODOO_DB,
                  auth.uid,
                  auth.password,
                  'stock.picking',
                  'read',
                  [pickingIds],
                  {
                    fields: ['id', 'state', 'picking_type_id'],
                  },
                ],
              },
            }

            const pickingResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pickingRequest),
            })

            const pickingData = await pickingResponse.json()
            if (pickingData.result && pickingData.result.length > 0) {
              // Chercher un picking de type "out" (livraison sortante)
              // Le picking_type_id est généralement [id, name] où name contient "out" ou "Delivery"
              const outPicking = pickingData.result.find((p: any) => {
                const pickingType = Array.isArray(p.picking_type_id) ? p.picking_type_id[1] : ''
                return pickingType && (pickingType.toLowerCase().includes('out') || pickingType.toLowerCase().includes('delivery'))
              })
              
              if (outPicking) {
                deliveryState = outPicking.state
                console.log(`✅ Statut livraison récupéré pour commande ${order.id}:`, deliveryState)
              } else {
                // Si pas de picking "out", prendre le premier picking disponible
                deliveryState = pickingData.result[0].state
                console.log(`⚠️  Pas de picking "out" pour commande ${order.id}, utilisation du premier:`, deliveryState)
              }
            }
          } catch (error) {
            console.warn(`⚠️  Impossible de récupérer le statut de livraison pour la commande ${order.id}:`, error)
          }
        }

        return {
          ...order,
          title,
          project_state: projectState,
          delivery_state: deliveryState,
        }
      })

      const enrichedOrdersResults = await Promise.allSettled(enrichedOrdersPromises)
      const enrichedOrders = enrichedOrdersResults
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value
          } else {
            console.error(`❌ Erreur lors de l'enrichissement de la commande ${orders[index]?.id}:`, result.reason)
            // Retourner la commande originale si l'enrichissement échoue
            return orders[index]
          }
        })
        .filter((order): order is OdooOrder => order !== undefined)

      return enrichedOrders
    } catch (error) {
      // Si l'enrichissement échoue complètement, retourner les commandes de base
      console.error('❌ Erreur lors de l\'enrichissement des commandes, retour des commandes de base:', error)
      return orders
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des commandes:', error)
    return []
  }
}

/**
 * Récupère les détails d'une commande avec ses lignes
 */
export async function getOrderDetails(orderId: number): Promise<{ order: OdooOrder | null; lines: OdooOrderLine[] }> {
  try {
    const auth = await authenticateOdoo()
    if (!auth) {
      return { order: null, lines: [] }
    }

    // Récupérer la commande
    const orderRequest = {
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
          'read',
          [[orderId]],
          {
            fields: [
              'id',
              'name',
              'date_order',
              'state',
              'amount_total',
              'partner_id',
              'order_line',
              'note',
              'create_date',
              'write_date',
            ],
          },
        ],
      },
    }

    const orderResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderRequest),
    })

    const orderData = await orderResponse.json()
    const order = orderData.result?.[0] || null

    if (!order) {
      return { order: null, lines: [] }
    }

    // Récupérer les lignes de commande
    const lineIds = order.order_line || []
    if (lineIds.length === 0) {
      return { order, lines: [] }
    }

    const linesRequest = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          auth.uid,
          auth.password,
          'sale.order.line',
          'read',
          [lineIds],
          {
            fields: [
              'id',
              'product_id',
              'name',
              'product_uom_qty',
              'price_unit',
              'price_subtotal',
              'product_no_variant_attribute_value_ids', // Attributs (tailles, couleurs)
            ],
          },
        ],
      },
    }

    const linesResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linesRequest),
    })

    const linesData = await linesResponse.json()
    const lines = linesData.result || []

    // Récupérer les valeurs d'attributs (tailles) pour toutes les lignes
    const allAttributeValueIds = [...new Set(lines.flatMap((line: any) => line.product_no_variant_attribute_value_ids || []))]
    
    let attributeValueMap = new Map<number, { name: string; attributeId: number }>()
    let sizeAttributeIds = new Set<number>()
    
    if (allAttributeValueIds.length > 0) {
      try {
        // Récupérer les valeurs d'attributs
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
              'product.attribute.value',
              'read',
              [allAttributeValueIds],
              { fields: ['name', 'attribute_id'] },
            ],
          },
        }

        const attributeValueResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attributeValueRequest),
        })

        const attributeValueData = await attributeValueResponse.json()
        const attributeValues = attributeValueData.result || []

        // Créer une map des valeurs d'attributs
        for (const av of attributeValues) {
          attributeValueMap.set(av.id, {
            name: av.name,
            attributeId: av.attribute_id[0],
          })
        }

        // Récupérer les attributs pour identifier les tailles
        const attributeIds = [...new Set(attributeValues.map((av: any) => av.attribute_id[0]))]
        
        if (attributeIds.length > 0) {
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
                [attributeIds],
                { fields: ['name'] },
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
          
          // Identifier les IDs d'attributs de type SIZE
          for (const attr of attributes) {
            if (attr.name.toUpperCase() === 'SIZE') {
              sizeAttributeIds.add(attr.id)
            }
          }
        }
      } catch (error) {
        console.warn('⚠️  Impossible de récupérer les attributs des lignes de commande:', error)
      }
    }
    
    const enrichedLines = lines.map((line: any) => {
      const attributeValueIds = line.product_no_variant_attribute_value_ids || []
      const sizes: string[] = []
      
      for (const avId of attributeValueIds) {
        const avInfo = attributeValueMap.get(avId)
        if (avInfo && sizeAttributeIds.has(avInfo.attributeId)) {
          sizes.push(avInfo.name)
        }
      }

      return {
        ...line,
        sizes: sizes.length > 0 ? sizes : undefined,
      }
    })

    return { order, lines: enrichedLines }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des détails de la commande:', error)
    return { order: null, lines: [] }
  }
}

/**
 * Traduit le statut Odoo en français
 */
export function translateOrderState(state: string): string {
  const translations: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'Envoyé',
    sale: 'Confirmé',
    done: 'Terminé',
    cancel: 'Annulé',
  }
  return translations[state] || state
}

/**
 * Retourne la couleur du badge selon le statut de commande
 * Vert = Expédié/Livré, Rouge = Annulé, Bleu = En cours, Gris = Brouillon
 */
export function getOrderStateColor(state: string): string {
  const colors: Record<string, string> = {
    draft: '!bg-gray-600',        // Gris pour brouillon
    sent: '!bg-blue-600',         // Bleu pour envoyé
    sale: '!bg-blue-700',         // Bleu foncé pour confirmé
    done: '!bg-green-700',        // Vert pour terminé/expédié
    cancel: '!bg-red-600',        // Rouge pour annulé
  }
  return colors[state] || '!bg-gray-600'
}

/**
 * Traduit le statut/étape du projet Odoo en français
 * Le state peut être soit un code (draft, open, etc.) soit directement le nom de l'étape
 */
export function translateProjectState(state: string): string {
  // Si c'est déjà un nom d'étape en français, on le retourne tel quel
  // Sinon on traduit les codes standards
  const translations: Record<string, string> = {
    draft: 'En attente',
    open: 'En production',
    done: 'Livré',
    cancel: 'Annulé',
    close: 'Clôturé',
    // Noms d'étapes courants (au cas où ils seraient en anglais)
    'En attente': 'En attente',
    'BAT': 'BAT',
    'Stock': 'Stock',
    'Livré': 'Livré',
  }
  // Si le state est déjà dans les traductions, on l'utilise
  // Sinon on retourne le state tel quel (supposé être déjà en français)
  return translations[state] || state
}

/**
 * Retourne la couleur du badge selon le statut/étape du projet
 * Vert = Livré, Rouge = Annulé, Bleu = En production, Jaune = BAT, Indigo = Stock, Gris = En attente
 */
export function getProjectStateColor(state: string): string {
  const stateLower = state.toLowerCase().trim()
  const colors: Record<string, string> = {
    // Codes standards
    draft: '!bg-gray-600',        // Gris pour en attente
    open: '!bg-blue-600',        // Bleu pour en production
    done: '!bg-green-700',        // Vert pour livré
    cancel: '!bg-red-600',        // Rouge pour annulé
    close: '!bg-gray-700',        // Gris foncé pour clôturé
    // Noms d'étapes courants
    'en attente': '!bg-gray-600', // Gris pour en attente
    'bat': '!bg-yellow-600',      // Jaune pour BAT
    'stock': '!bg-indigo-600',    // Indigo pour stock
    'livré': '!bg-green-700',    // Vert pour livré
    'livre': '!bg-green-700',     // Vert pour livré (sans accent)
    'en production': '!bg-blue-600', // Bleu pour en production
    'production': '!bg-blue-600',   // Bleu pour production
    'expédié': '!bg-green-700',   // Vert pour expédié
    'expedie': '!bg-green-700',   // Vert pour expédié (sans accent)
    'annulé': '!bg-red-600',      // Rouge pour annulé
    'annule': '!bg-red-600',      // Rouge pour annulé (sans accent)
  }
  // Chercher par code ou nom (insensible à la casse)
  return colors[stateLower] || colors[state] || '!bg-gray-600'
}

/**
 * Traduit le statut de livraison Odoo en français
 */
export function translateDeliveryState(state: string): string {
  const translations: Record<string, string> = {
    draft: 'Brouillon',
    wait: 'En attente',
    confirmed: 'Confirmé',
    assigned: 'Assigné',
    ready: 'Prêt',
    done: 'Livré',
    cancel: 'Annulé',
  }
  return translations[state] || state
}

/**
 * Retourne la couleur du badge selon le statut de livraison
 * Vert = Livré/Expédié, Rouge = Annulé, Bleu = Confirmé/Assigné, Jaune = En attente, Orange = Prêt
 */
export function getDeliveryStateColor(state: string): string {
  const stateLower = state.toLowerCase()
  const colors: Record<string, string> = {
    draft: '!bg-gray-600',        // Gris pour brouillon
    wait: '!bg-yellow-600',        // Jaune pour en attente
    waiting: '!bg-yellow-600',     // Jaune pour en attente
    confirmed: '!bg-blue-600',     // Bleu pour confirmé
    assigned: '!bg-blue-700',     // Bleu foncé pour assigné
    ready: '!bg-orange-600',      // Orange pour prêt
    done: '!bg-green-700',        // Vert pour livré/expédié
    cancel: '!bg-red-600',        // Rouge pour annulé
    cancelled: '!bg-red-600',     // Rouge pour annulé
  }
  return colors[stateLower] || colors[state] || '!bg-gray-600'
}

