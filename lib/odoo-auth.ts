import { cookies } from 'next/headers'

/**
 * Configuration Odoo pour l'authentification
 */
const ODOO_URL = process.env.NEXT_PUBLIC_ODOO_URL || ''
const ODOO_DB = process.env.NEXT_PUBLIC_ODOO_DB || ''
const ODOO_USERNAME = process.env.NEXT_PUBLIC_ODOO_USERNAME || ''
const ODOO_PASSWORD = process.env.NEXT_PUBLIC_ODOO_PASSWORD || ''
const ODOO_API_KEY = process.env.ODOO_API_KEY || ''

/**
 * Interface pour les informations du client
 */
export interface OdooClient {
  id: number
  name: string
  email: string
  partnerId: number // ID du partenaire dans Odoo
  company?: string
  phone?: string
  street?: string
  city?: string
  zip?: string
  country?: string
}

/**
 * Authentification Odoo et récupération de l'UID
 * Utilise la même méthode que lib/odoo-products.ts
 */
async function authenticateOdoo(): Promise<{ uid: number; password: string } | null> {
  try {
    // Méthode 1: Utiliser /web/session/authenticate (comme dans lib/odoo-products.ts)
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
      resultKeys: data.result ? Object.keys(data.result) : [],
    })
    
    if (data.result && data.result.uid) {
      console.log('✅ Authentification système Odoo réussie, UID:', data.result.uid)
      return {
        uid: data.result.uid,
        password: ODOO_PASSWORD,
      }
    }
    
    // Vérifier s'il y a une erreur
    if (data.error) {
      console.error('❌ Erreur Odoo:', data.error)
    } else {
      console.error('❌ Authentification échouée, réponse complète:', JSON.stringify(data, null, 2))
    }
    
    return null
  } catch (error) {
    console.error('❌ Erreur d\'authentification Odoo:', error)
    return null
  }
}

/**
 * Vérifie les identifiants d'un client et retourne ses informations
 */
export async function verifyClientCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; client?: OdooClient; error?: string }> {
  try {
    console.log('🔍 Vérification des identifiants pour:', email)
    
    // Authentification avec les identifiants système
    const auth = await authenticateOdoo()
    if (!auth) {
      console.error('❌ Échec de l\'authentification système Odoo')
      return { success: false, error: 'Erreur d\'authentification système' }
    }
    
    console.log('✅ Authentification système réussie, UID:', auth.uid)

    // Rechercher le client (partner) par email
    // On cherche d'abord sans filtre is_company pour être plus flexible
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
          'res.partner',
          'search_read',
          [[['email', '=', email]]], // Enlever le filtre is_company pour être plus flexible
          {
            fields: ['id', 'name', 'email', 'phone', 'parent_id', 'is_company', 'street', 'city', 'zip', 'country_id'],
            limit: 1,
          },
        ],
      },
    }

    console.log('📤 Recherche du partenaire par email:', email)
    const searchResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    })

    const searchData = await searchResponse.json()

    if (searchData.error) {
      console.error('❌ Erreur lors de la recherche:', searchData.error)
      return { success: false, error: searchData.error.message || searchData.error.data?.message || 'Erreur lors de la recherche du client' }
    }

    const partners = searchData.result || []
    console.log(`📦 ${partners.length} partenaire(s) trouvé(s)`)
    
    if (partners.length === 0) {
      console.warn('⚠️  Aucun partenaire trouvé avec l\'email:', email)
      return { success: false, error: 'Aucun client trouvé avec cet email. Vérifiez que l\'email existe dans Odoo.' }
    }

    const partner = partners[0]
    console.log('✅ Partenaire trouvé:', {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      is_company: partner.is_company,
    })

    // Vérifier le mot de passe (vous pouvez utiliser un champ personnalisé dans Odoo)
    // Pour l'instant, on vérifie simplement que l'email existe
    // Vous pouvez ajouter un champ personnalisé 'client_password' dans res.partner
    
    // Option 1: Utiliser un champ personnalisé (à créer dans Odoo)
    // const passwordRequest = {
    //   jsonrpc: '2.0',
    //   method: 'call',
    //   params: {
    //     service: 'object',
    //     method: 'execute_kw',
    //     args: [
    //       ODOO_DB,
    //       auth.uid,
    //       auth.password,
    //       'res.partner',
    //       'read',
    //       [[partner.id]],
    //       { fields: ['x_client_password'] },
    //     ],
    //   },
    // }
    // const passwordResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(passwordRequest),
    // })
    // const passwordData = await passwordResponse.json()
    // const storedPassword = passwordData.result?.[0]?.x_client_password
    // if (storedPassword !== password) {
    //   return { success: false, error: 'Mot de passe incorrect' }
    // }

    // Option 2: Pour l'instant, on accepte n'importe quel mot de passe si l'email existe
    // TODO: Implémenter une vraie vérification de mot de passe avec un champ personnalisé
    
    // Pour l'instant, on accepte la connexion si l'email existe
    // Vous pouvez ajouter un champ personnalisé 'x_client_password' dans res.partner pour une vraie vérification

    // Récupérer le nom du pays si country_id est présent
    let countryName = 'France' // Par défaut
    if (partner.country_id && Array.isArray(partner.country_id) && partner.country_id.length > 1) {
      countryName = partner.country_id[1]
    }

    const client: OdooClient = {
      id: partner.id,
      name: partner.name || '',
      email: partner.email || email,
      partnerId: partner.id,
      company: partner.parent_id ? (Array.isArray(partner.parent_id) ? partner.parent_id[1] : partner.parent_id) : undefined,
      phone: partner.phone || undefined,
      street: partner.street || undefined,
      city: partner.city || undefined,
      zip: partner.zip || undefined,
      country: countryName,
    }

    console.log('✅ Client authentifié avec succès:', client.name)
    return { success: true, client }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des identifiants:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

/**
 * Récupère les informations du client depuis la session
 */
export async function getClientFromSession(): Promise<OdooClient | null> {
  try {
    const cookieStore = await cookies()
    const clientData = cookieStore.get('odoo_client')
    
    if (!clientData || !clientData.value) {
      return null
    }

    return JSON.parse(clientData.value) as OdooClient
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error)
    return null
  }
}

/**
 * Définit la session du client
 */
export async function setClientSession(client: OdooClient): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set('odoo_client', JSON.stringify(client), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    })
  } catch (error) {
    console.error('Erreur lors de la définition de la session:', error)
  }
}

/**
 * Supprime la session du client
 */
export async function clearClientSession(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('odoo_client')
  } catch (error) {
    console.error('Erreur lors de la suppression de la session:', error)
  }
}

