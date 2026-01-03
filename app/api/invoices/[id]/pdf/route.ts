import { NextRequest, NextResponse } from 'next/server'
import { getClientFromSession } from '@/lib/odoo-auth'
import { getInvoicesFromOdoo } from '@/lib/odoo-invoices'

export const dynamic = 'force-dynamic'

const ODOO_URL = process.env.NEXT_PUBLIC_ODOO_URL || ''
const ODOO_DB = process.env.NEXT_PUBLIC_ODOO_DB || ''
const ODOO_USERNAME = process.env.NEXT_PUBLIC_ODOO_USERNAME || ''
const ODOO_PASSWORD = process.env.NEXT_PUBLIC_ODOO_PASSWORD || ''

/**
 * Authentification Odoo pour obtenir une session
 */
async function authenticateOdoo(): Promise<{ uid: number; sessionId: string; cookies: string[] } | null> {
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
    
    // Récupérer les cookies de la réponse
    const cookies: string[] = []
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      cookies.push(setCookieHeader)
    }
    
    // Extraire session_id des cookies ou de la réponse
    let sessionId: string | null = null
    if (data.result && data.result.session_id) {
      sessionId = data.result.session_id
    } else if (setCookieHeader) {
      // Extraire session_id du cookie
      const sessionMatch = setCookieHeader.match(/session_id=([^;]+)/)
      if (sessionMatch) {
        sessionId = sessionMatch[1]
      }
    }
    
    if (data.result && data.result.uid && sessionId) {
      console.log('✅ Authentification réussie, uid:', data.result.uid, 'sessionId:', sessionId)
      return {
        uid: data.result.uid,
        sessionId: sessionId,
        cookies: cookies,
      }
    }
    
    console.error('❌ Authentification échouée, réponse:', JSON.stringify(data, null, 2))
    console.error('   Cookies reçus:', cookies)
    return null
  } catch (error) {
    console.error('❌ Erreur authentification Odoo:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    return null
  }
}

/**
 * GET - Télécharger le PDF d'une facture depuis Odoo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification du client
    const client = await getClientFromSession()
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params
    const invoiceId = parseInt(id)
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { success: false, error: 'ID de facture invalide' },
        { status: 400 }
      )
    }

    // Vérifier que la facture appartient au client
    const invoices = await getInvoicesFromOdoo(client)
    const invoiceExists = invoices.some(inv => inv.id === invoiceId)
    
    if (!invoiceExists) {
      return NextResponse.json(
        { success: false, error: 'Facture non trouvée ou accès non autorisé' },
        { status: 404 }
      )
    }

    // Authentifier avec Odoo pour obtenir une session
    const auth = await authenticateOdoo()
    if (!auth) {
      console.error('❌ Échec authentification Odoo pour PDF')
      return NextResponse.json(
        { success: false, error: 'Erreur d\'authentification Odoo. Vérifiez les logs serveur.' },
        { status: 500 }
      )
    }

    console.log('✅ Authentification Odoo réussie, sessionId:', auth.sessionId, 'cookies:', auth.cookies.length)

    // Récupérer le PDF depuis Odoo
    // Dans Odoo, l'URL pour télécharger le PDF d'une facture peut varier selon la version
    // On essaie plusieurs formats possibles
    const pdfUrls = [
      `${ODOO_URL}/report/pdf/account.report_invoice_with_payments/${invoiceId}`,
      `${ODOO_URL}/report/pdf/account.report_invoice/${invoiceId}`,
      `${ODOO_URL}/web/content?model=account.move&id=${invoiceId}&filename_field=name&download=true&format=pdf`,
    ]

    let lastError: Error | null = null

    for (const pdfUrl of pdfUrls) {
      try {
        console.log('🔄 Tentative récupération PDF depuis:', pdfUrl)
        
        // Faire la requête avec les cookies de session Odoo
        const cookieHeader = auth.cookies.length > 0 
          ? auth.cookies.join('; ')
          : `session_id=${auth.sessionId}`
        
        const pdfResponse = await fetch(pdfUrl, {
          method: 'GET',
          headers: {
            'Cookie': cookieHeader,
            'Accept': 'application/pdf',
          },
        })

        console.log('📥 Réponse PDF:', pdfResponse.status, pdfResponse.statusText, pdfResponse.headers.get('content-type'))

        if (pdfResponse.ok) {
          const contentType = pdfResponse.headers.get('content-type')
          
          // Vérifier que c'est bien un PDF
          if (contentType && contentType.includes('application/pdf')) {
            const pdfBuffer = await pdfResponse.arrayBuffer()
            const invoice = invoices.find(inv => inv.id === invoiceId)
            const filename = invoice?.name 
              ? `facture_${invoice.name.replace(/[^a-z0-9]/gi, '_')}.pdf`
              : `facture_${invoiceId}.pdf`

            console.log('✅ PDF récupéré avec succès, taille:', pdfBuffer.byteLength)
            return new NextResponse(pdfBuffer, {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
              },
            })
          } else {
            console.warn('⚠️  Réponse n\'est pas un PDF, content-type:', contentType)
            // Continuer avec la prochaine URL
            continue
          }
        } else {
          console.warn(`⚠️  Erreur HTTP ${pdfResponse.status} pour ${pdfUrl}`)
          // Continuer avec la prochaine URL
          continue
        }
      } catch (error) {
        console.warn(`⚠️  Erreur lors de la tentative ${pdfUrl}:`, error)
        lastError = error instanceof Error ? error : new Error(String(error))
        // Continuer avec la prochaine URL
        continue
      }
    }

    // Si aucune URL n'a fonctionné
    console.error('❌ Impossible de récupérer le PDF depuis Odoo avec toutes les méthodes')
    if (lastError) {
      console.error('   Dernière erreur:', lastError.message)
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Impossible de récupérer le PDF depuis Odoo. Vérifiez la configuration Odoo.',
        details: lastError?.message
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('❌ Erreur téléchargement PDF facture:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

