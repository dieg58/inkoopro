import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Initialiser Resend avec la clé API depuis les variables d'environnement
const resendApiKey = process.env.RESEND_API_KEY || 're_h544tgd3_6p7U7ZSynxkGPiQF4zu4zmFQ'
const resend = new Resend(resendApiKey)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requis' },
        { status: 400 }
      )
    }

    // Valider l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Adresse email invalide' },
        { status: 400 }
      )
    }

    console.log('🔐 Demande de réinitialisation de mot de passe pour:', email)

    // Chercher le client dans la base locale
    // Note: On ne peut réinitialiser que les comptes locaux, pas ceux d'Odoo
    let client = null
    try {
      client = await prisma.client.findUnique({
        where: { email },
      })
    } catch (dbError) {
      console.error('❌ Erreur lors de l\'accès à la base de données:', dbError)
      // Pour des raisons de sécurité, on retourne toujours un succès même si le client n'existe pas
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un email de réinitialisation.',
      })
    }

    // Si le client n'existe pas dans la base locale, vérifier s'il existe dans Odoo
    if (!client) {
      console.log('🔍 Client non trouvé dans la base locale, vérification dans Odoo...')
      const { verifyClientCredentials } = await import('@/lib/odoo-auth')
      const odooResult = await verifyClientCredentials(email, '') // Vérifier seulement l'existence
      
      if (odooResult.success && odooResult.client) {
        console.log('✅ Client trouvé dans Odoo, création du compte local...')
        const odooClient = odooResult.client
        
        // Créer le compte local sans mot de passe (il sera défini via le token de réinitialisation)
        client = await prisma.client.create({
          data: {
            email: odooClient.email,
            odooId: odooClient.id,
            name: odooClient.name,
            company: odooClient.company || null,
            phone: odooClient.phone || null,
            street: odooClient.street || null,
            city: odooClient.city || null,
            zip: odooClient.zip || null,
            country: odooClient.country || null,
            status: 'approved', // Les clients Odoo sont automatiquement approuvés
            // Pas de mot de passe - il sera défini via le token de réinitialisation
          },
        })
      } else {
        // Pour des raisons de sécurité, on retourne toujours un succès même si le client n'existe pas
        console.log('⚠️  Client non trouvé dans Odoo ni dans la base locale:', email)
        return NextResponse.json({
          success: true,
          message: 'Si un compte existe avec cet email, vous recevrez un email de réinitialisation.',
        })
      }
    }
    
    // Si le client existe mais n'a pas de mot de passe, on peut quand même envoyer un email de réinitialisation
    if (!client.password) {
      console.log('⚠️  Client trouvé mais pas de mot de passe, envoi de l\'email de réinitialisation:', email)
      // On continue pour générer le token et envoyer l'email
    }

    // Vérifier le statut du client
    if (client.status === 'pending') {
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un email de réinitialisation.',
      })
    }

    if (client.status === 'rejected') {
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un email de réinitialisation.',
      })
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpires = new Date()
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1) // Token valide pendant 1 heure

    // Sauvegarder le token dans la base de données
    await prisma.client.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpires,
      },
    })

    // Construire l'URL de réinitialisation
    // En production, utiliser NEXT_PUBLIC_BASE_URL ou construire depuis les headers de la requête
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) {
      // Essayer de construire depuis les headers de la requête
      const origin = request.headers.get('origin')
      const host = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || (origin ? new URL(origin).protocol : 'https')
      
      if (host) {
        baseUrl = `${protocol}//${host}`
      } else if (origin) {
        baseUrl = origin
      } else {
        baseUrl = 'http://localhost:3000' // Fallback pour le développement local
      }
    }
    
    // S'assurer que l'URL ne se termine pas par un slash
    baseUrl = baseUrl.replace(/\/$/, '')
    // Utiliser /fr/reset-password par défaut (la locale sera gérée par le middleware)
    const resetUrl = `${baseUrl}/fr/reset-password?token=${resetToken}`
    
    console.log('🔗 URL de réinitialisation construite:', {
      baseUrl,
      resetUrl: resetUrl.substring(0, 80) + '...',
      hasToken: !!resetToken,
    })

    // Envoyer l'email de réinitialisation
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
      const resendApiKey = process.env.RESEND_API_KEY
      
      if (!resendApiKey || resendApiKey === 're_h544tgd3_6p7U7ZSynxkGPiQF4zu4zmFQ') {
        console.warn('⚠️  RESEND_API_KEY non configuré ou utilise la clé par défaut')
      }
      
      console.log('📤 Envoi email de réinitialisation via Resend:', {
        from: fromEmail,
        to: email,
        hasApiKey: !!resendApiKey && resendApiKey !== 're_h544tgd3_6p7U7ZSynxkGPiQF4zu4zmFQ',
        resetUrl: resetUrl.substring(0, 80) + '...',
      })

      const { data, error } = await resend.emails.send({
        from: `INKOO PRO <${fromEmail}>`,
        to: [email],
        subject: 'Réinitialisation de votre mot de passe INKOO PRO',
        text: `
Bonjour ${client.name},

Vous avez demandé à réinitialiser votre mot de passe pour votre compte INKOO PRO.

Cliquez sur le lien suivant pour réinitialiser votre mot de passe :
${resetUrl}

Ce lien est valide pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.

Cordialement,
L'équipe INKOO PRO
        `.trim(),
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2d5016 0%, #4a7c2a 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">INKOO PRO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Réinitialisation de mot de passe</p>
            </div>
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 20px 0;">Bonjour ${client.name},</p>
              <p style="margin: 0 0 20px 0;">Vous avez demandé à réinitialiser votre mot de passe pour votre compte INKOO PRO.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #2d5016; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Réinitialiser mon mot de passe</a>
              </div>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #666;">Ce lien est valide pendant 1 heure.</p>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #666;">Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
                <p style="margin: 5px 0;">Cordialement,</p>
                <p style="margin: 5px 0;">L'équipe INKOO PRO</p>
              </div>
            </div>
          </body>
          </html>
        `,
      })

      if (error) {
        console.error('❌ Erreur Resend:', error)
        console.error('   Détails:', JSON.stringify(error, null, 2))
        throw new Error(`Erreur lors de l'envoi de l'email: ${error.message || 'Erreur inconnue'}`)
      }

      console.log('✅ Email de réinitialisation envoyé avec succès via Resend:', {
        emailId: data?.id,
        to: email,
        from: fromEmail,
      })
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError)
      if (emailError instanceof Error) {
        console.error('   Message:', emailError.message)
        console.error('   Stack:', emailError.stack)
      }
      // En production, on peut vouloir retourner une erreur pour diagnostiquer
      // Mais pour des raisons de sécurité, on retourne un succès générique
      // L'erreur réelle est loggée pour le debugging
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un email de réinitialisation.',
        // En développement, on peut inclure l'erreur pour le debugging
        ...(process.env.NODE_ENV === 'development' && { debugError: emailError instanceof Error ? emailError.message : String(emailError) }),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Si un compte existe avec cet email, vous recevrez un email de réinitialisation.',
    })
  } catch (error) {
    console.error('❌ Erreur lors de la demande de réinitialisation:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    // Pour des raisons de sécurité, on retourne toujours un succès
    return NextResponse.json({
      success: true,
      message: 'Si un compte existe avec cet email, vous recevrez un email de réinitialisation.',
      // En développement, on peut inclure l'erreur pour le debugging
      ...(process.env.NODE_ENV === 'development' && { debugError: error instanceof Error ? error.message : String(error) }),
    })
  }
}

