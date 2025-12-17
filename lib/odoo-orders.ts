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

    console.log('📦 Récupération des commandes pour le client:', client.name, '(Partner ID:', client.partnerId, ')')

    // Rechercher les commandes du client
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
          [[['partner_id', '=', client.partnerId]]],
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

    return orders
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

    return { order, lines }
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
 * Retourne la couleur du badge selon le statut
 */
export function getOrderStateColor(state: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-500',
    sent: 'bg-blue-500',
    sale: 'bg-green-500',
    done: 'bg-green-600',
    cancel: 'bg-red-500',
  }
  return colors[state] || 'bg-gray-500'
}

