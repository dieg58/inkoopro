/**
 * Fonctions pour récupérer les factures depuis Odoo
 */

const ODOO_URL = process.env.NEXT_PUBLIC_ODOO_URL || ''
const ODOO_DB = process.env.NEXT_PUBLIC_ODOO_DB || ''
const ODOO_USERNAME = process.env.NEXT_PUBLIC_ODOO_USERNAME || ''
const ODOO_PASSWORD = process.env.NEXT_PUBLIC_ODOO_PASSWORD || ''
const ODOO_API_KEY = process.env.ODOO_API_KEY || ''

export interface OdooInvoice {
  id: number
  name: string // Numéro de facture (ex: "INV/2024/0001")
  invoice_date: string // Date de facturation
  invoice_date_due: string // Date d'échéance
  amount_total: number // Montant total TTC
  amount_untaxed: number // Montant HT
  amount_tax: number // Montant de la TVA
  state: string // État: draft, posted, paid, cancel
  payment_state: string // État de paiement: not_paid, partial, paid, reversed, invoicing
  partner_id: [number, string] // [ID, Nom du client]
  move_type: string // Type: out_invoice (facture client), in_invoice (facture fournisseur)
  ref: string | null // Référence
  origin: string | null // Origine (ex: numéro de commande)
}

/**
 * Authentification Odoo
 */
async function authenticateOdoo(): Promise<{ uid: number; password: string } | null> {
  try {
    if (!ODOO_URL || !ODOO_DB || !ODOO_USERNAME || !ODOO_PASSWORD) {
      console.error('❌ Configuration Odoo incomplète')
      return null
    }

    const response = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    console.error('Erreur authentification Odoo:', error)
    return null
  }
}

/**
 * Récupère les factures d'un client depuis Odoo
 */
export async function getInvoicesFromOdoo(partnerId: number): Promise<OdooInvoice[]> {
  try {
    if (!ODOO_URL || !ODOO_DB) {
      console.warn('⚠️  Odoo non configuré')
      return []
    }

    const auth = await authenticateOdoo()
    if (!auth) {
      console.error('❌ Échec authentification Odoo')
      return []
    }

    // Récupérer les factures client (out_invoice) pour ce partenaire
    // Dans Odoo moderne (v14+), les factures sont dans account.move
    // Dans les anciennes versions, c'est account.invoice
    const request = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          auth.uid,
          auth.password,
          'account.move', // Modèle moderne Odoo
          'search_read',
          [
            [
              ['partner_id', '=', partnerId],
              ['move_type', '=', 'out_invoice'], // Factures client uniquement
            ],
          ],
          {
            fields: [
              'id',
              'name',
              'invoice_date',
              'invoice_date_due',
              'amount_total',
              'amount_untaxed',
              'amount_tax',
              'state',
              'payment_state',
              'partner_id',
              'move_type',
              'ref',
              'origin',
            ],
            order: 'invoice_date desc', // Plus récentes en premier
            limit: 100,
          },
        ],
      },
    }

    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data = await response.json()
    
    if (data.error) {
      console.error('❌ Erreur récupération factures:', data.error)
      return []
    }

    const invoices = data.result || []
    console.log(`✅ ${invoices.length} facture(s) récupérée(s) depuis Odoo`)
    
    return invoices.map((inv: any) => ({
      id: inv.id,
      name: inv.name || '',
      invoice_date: inv.invoice_date || '',
      invoice_date_due: inv.invoice_date_due || '',
      amount_total: inv.amount_total || 0,
      amount_untaxed: inv.amount_untaxed || 0,
      amount_tax: inv.amount_tax || 0,
      state: inv.state || 'draft',
      payment_state: inv.payment_state || 'not_paid',
      partner_id: inv.partner_id || [0, ''],
      move_type: inv.move_type || 'out_invoice',
      ref: inv.ref || null,
      origin: inv.origin || null,
    }))
  } catch (error) {
    console.error('❌ Erreur récupération factures Odoo:', error)
    return []
  }
}

/**
 * Traduit l'état de paiement en français
 */
export function translatePaymentState(state: string): string {
  const translations: Record<string, string> = {
    not_paid: 'Non payée',
    partial: 'Partiellement payée',
    paid: 'Payée',
    reversed: 'Annulée',
    invoicing: 'En facturation',
  }
  return translations[state] || state
}

/**
 * Traduit l'état de la facture en français
 */
export function translateInvoiceState(state: string): string {
  const translations: Record<string, string> = {
    draft: 'Brouillon',
    posted: 'Validée',
    paid: 'Payée',
    cancel: 'Annulée',
  }
  return translations[state] || state
}

/**
 * Retourne la couleur pour un état de paiement
 */
export function getPaymentStateColor(state: string): string {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800 border-green-200',
    partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    not_paid: 'bg-red-100 text-red-800 border-red-200',
    reversed: 'bg-gray-100 text-gray-800 border-gray-200',
    invoicing: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  return colors[state] || 'bg-gray-100 text-gray-800 border-gray-200'
}

/**
 * Vérifie si une facture est échue
 */
export function isInvoiceOverdue(invoice: OdooInvoice): boolean {
  if (invoice.payment_state === 'paid') return false
  if (!invoice.invoice_date_due) return false
  
  const dueDate = new Date(invoice.invoice_date_due)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  
  return dueDate < today
}

