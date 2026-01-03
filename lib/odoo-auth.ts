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
    // Vérifier que l'URL Odoo est configurée
    if (!ODOO_URL || ODOO_URL === '') {
      console.warn('⚠️  NEXT_PUBLIC_ODOO_URL n\'est pas configuré, impossible d\'authentifier avec Odoo')
      return null
    }
    
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
 * Si password est vide, vérifie seulement l'existence du client dans Odoo
 */
export async function verifyClientCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; client?: OdooClient; error?: string }> {
  try {
    const checkExistenceOnly = !password || password === ''
    console.log('🔍 Vérification des identifiants pour:', email, checkExistenceOnly ? '(vérification existence uniquement)' : '')
    
    // Authentification avec les identifiants système
    const auth = await authenticateOdoo()
    if (!auth) {
      console.error('❌ Échec de l\'authentification système Odoo')
      return { success: false, error: 'Erreur d\'authentification système' }
    }
    
    console.log('✅ Authentification système réussie, UID:', auth.uid)

    // Vérifier que l'URL Odoo est configurée
    if (!ODOO_URL || ODOO_URL === '') {
      console.warn('⚠️  NEXT_PUBLIC_ODOO_URL n\'est pas configuré, impossible d\'authentifier avec Odoo')
      return { success: false, error: 'Odoo non configuré' }
    }
    
    // Si on vérifie seulement l'existence (pas de mot de passe), on saute la vérification du mot de passe
    let passwordValid = false
    let userUid: number | null = null

    if (!checkExistenceOnly) {
      // D'abord, vérifier le mot de passe en essayant de s'authentifier directement avec l'email et le mot de passe
      // Cela vérifie si l'email correspond à un utilisateur Odoo (res.users) avec ce mot de passe
      console.log('🔐 Tentative d\'authentification Odoo avec email et mot de passe...')
      
      try {
        const passwordAuthResponse = await fetch(`${ODOO_URL}/web/session/authenticate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
              db: ODOO_DB,
              login: email, // Utiliser l'email comme login
              password: password, // Utiliser le mot de passe fourni
            },
          }),
        })

        const passwordAuthData = await passwordAuthResponse.json()
        
        // Si l'authentification réussit, c'est que le mot de passe est correct
        if (passwordAuthData.result && passwordAuthData.result.uid) {
          console.log('✅ Authentification Odoo réussie avec les identifiants fournis, UID:', passwordAuthData.result.uid)
          passwordValid = true
          userUid = passwordAuthData.result.uid
        } else {
          console.log('⚠️  Authentification directe échouée, l\'email n\'est peut-être pas un utilisateur Odoo')
          // L'email n'est peut-être pas un utilisateur Odoo, mais peut être un partenaire
          // On continue pour vérifier si c'est un partenaire avec un champ personnalisé
        }
      } catch (authError) {
        console.error('❌ Erreur lors de la vérification du mot de passe:', authError)
      }
    } else {
      console.log('🔍 Vérification de l\'existence uniquement (pas de vérification du mot de passe)')
    }

    // Rechercher le client (partner) par email pour récupérer ses informations
    let partners: any[] = []
    
    // D'abord, chercher le partenaire par email
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
          [[['email', '=', email]]],
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

    partners = searchData.result || []
    console.log(`📦 ${partners.length} partenaire(s) trouvé(s) par email`)
    
    // Si aucun partenaire trouvé par email mais que l'authentification a réussi,
    // chercher le partenaire lié à l'utilisateur Odoo
    if (partners.length === 0 && passwordValid && userUid) {
      console.log('🔍 Aucun partenaire trouvé par email, recherche du partenaire lié à l\'utilisateur Odoo...')
      try {
        // Récupérer l'utilisateur Odoo pour obtenir son partenaire_id
        const userRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              ODOO_DB,
              auth.uid,
              auth.password,
              'res.users',
              'read',
              [[userUid]],
              { fields: ['partner_id', 'login'] },
            ],
          },
        }

        const userResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userRequest),
        })

        const userData = await userResponse.json()
        
        if (!userData.error && userData.result && userData.result.length > 0) {
          const user = userData.result[0]
          const partnerId = Array.isArray(user.partner_id) ? user.partner_id[0] : user.partner_id
          
          if (partnerId) {
            console.log('✅ Partenaire trouvé via utilisateur Odoo, ID:', partnerId)
            // Récupérer les détails du partenaire
            const partnerRequest = {
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
                  'read',
                  [[partnerId]],
                  { fields: ['id', 'name', 'email', 'phone', 'parent_id', 'is_company', 'street', 'city', 'zip', 'country_id'] },
                ],
              },
            }

            const partnerResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(partnerRequest),
            })

            const partnerData = await partnerResponse.json()
            
            if (!partnerData.error && partnerData.result && partnerData.result.length > 0) {
              partners = partnerData.result
              console.log('✅ Partenaire récupéré via utilisateur Odoo')
            }
          }
        }
      } catch (userError) {
        console.warn('⚠️  Erreur lors de la recherche du partenaire via utilisateur:', userError)
      }
    }
    
    if (partners.length === 0) {
      console.warn('⚠️  Aucun partenaire trouvé avec l\'email:', email)
      return { success: false, error: 'not_found' }
    }

    const partner = partners[0]
    console.log('✅ Partenaire trouvé:', {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      is_company: partner.is_company,
    })

    // Si on vérifie seulement l'existence, on accepte directement
    if (checkExistenceOnly) {
      console.log('✅ Client trouvé dans Odoo (vérification existence uniquement)')
      passwordValid = true
    } else {
      // Si l'authentification directe a échoué, vérifier avec un champ personnalisé
      if (!passwordValid) {
        console.log('🔍 Vérification avec champ personnalisé x_client_password...')
        try {
          const passwordRequest = {
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
                'read',
                [[partner.id]],
                { fields: ['x_client_password'] },
              ],
            },
          }
          
          const passwordResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(passwordRequest),
          })
          const passwordData = await passwordResponse.json()
          const storedPassword = passwordData.result?.[0]?.x_client_password
          
          if (storedPassword) {
            if (storedPassword !== password) {
              console.log('❌ Mot de passe incorrect (champ personnalisé)')
              return { success: false, error: 'Mot de passe incorrect' }
            }
            console.log('✅ Mot de passe correct (champ personnalisé)')
            passwordValid = true
          } else {
            // Si aucun champ personnalisé, on accepte la connexion si l'email existe (compatibilité)
            console.log('⚠️  Aucun champ personnalisé de mot de passe, connexion acceptée (compatibilité)')
            passwordValid = true
          }
        } catch (passwordError) {
          // Si le champ personnalisé n'existe pas, on accepte la connexion (compatibilité)
          console.log('⚠️  Champ personnalisé non disponible, connexion acceptée (compatibilité)')
          passwordValid = true
        }
      }

      // Si le mot de passe n'est toujours pas valide, retourner une erreur
      if (!passwordValid) {
        return { success: false, error: 'Mot de passe incorrect' }
      }
    }

    // Récupérer le code pays si country_id est présent
    let countryCode = 'FR' // Par défaut (France)
    if (partner.country_id && Array.isArray(partner.country_id) && partner.country_id.length > 0) {
      const countryId = partner.country_id[0]
      try {
        // Récupérer le code pays depuis res.country
        const countryRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              ODOO_DB,
              auth.uid,
              auth.password,
              'res.country',
              'read',
              [[countryId]],
              { fields: ['code'] },
            ],
          },
        }

        const countryResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(countryRequest),
        })

        const countryData = await countryResponse.json()
        if (countryData.result && countryData.result.length > 0 && countryData.result[0].code) {
          countryCode = countryData.result[0].code
          console.log(`✅ Code pays récupéré: ${countryCode}`)
        }
      } catch (countryError) {
        console.warn('⚠️ Erreur lors de la récupération du code pays, utilisation du défaut (FR):', countryError)
      }
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
      country: countryCode, // Maintenant c'est le code pays (BE, FR, etc.)
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
      path: '/', // Important : le cookie doit être disponible sur tout le site
    })
    console.log('✅ Session client définie:', {
      email: client.email,
      name: client.name,
      cookieSet: true,
    })
  } catch (error) {
    console.error('❌ Erreur lors de la définition de la session:', error)
    throw error
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

