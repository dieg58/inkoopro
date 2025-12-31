import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

// Initialiser Resend avec la clé API depuis les variables d'environnement
const resendApiKey = process.env.RESEND_API_KEY || 're_h544tgd3_6p7U7ZSynxkGPiQF4zu4zmFQ'
const resend = new Resend(resendApiKey)

interface ContactRequest {
  type: 'pricing' | 'bug' | 'info' | 'improvement' | 'other'
  name: string
  email: string
  subject?: string
  message: string
}

const requestTypeLabels: Record<string, string> = {
  pricing: 'Demande de prix one-shot',
  bug: 'Signaler un bug',
  info: 'Demande d\'informations',
  improvement: 'Suggestion d\'amélioration',
  other: 'Autre',
}

/**
 * POST - Envoyer un message de contact
 */
export async function POST(request: NextRequest) {
  try {
    const body: ContactRequest = await request.json()
    const { type, name, email, subject, message } = body

    // Validation
    if (!type || !name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs obligatoires doivent être remplis' },
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

    console.log('📧 Nouveau message de contact:', {
      type,
      name,
      email,
      subject,
      message: message.substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
    })

    // Préparer le contenu de l'email
    const typeLabel = requestTypeLabels[type] || type
    const emailSubject = subject || `[${typeLabel}] Nouveau message de contact`
    const emailBody = `
Bonjour,

Vous avez reçu un nouveau message de contact depuis INKOO PRO :

Type de demande : ${typeLabel}
Nom : ${name}
Email : ${email}
${subject ? `Sujet : ${subject}` : ''}

Message :
${message}

---
Ce message a été envoyé depuis le formulaire de contact INKOO PRO.
Date : ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Brussels' })}
    `.trim()

    // Envoyer l'email via Resend
    try {
      // Email de réception (peut être configuré via variable d'environnement)
      const recipientEmail = process.env.CONTACT_EMAIL || 'hello@inkoo.eu'
      
      // Adresse d'envoi (doit être un domaine vérifié dans Resend)
      // Pour le moment, on utilise l'adresse par défaut de Resend
      // Vous devrez vérifier votre domaine dans Resend et utiliser votre propre domaine
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
      
      console.log('📤 Envoi email via Resend:', {
        from: fromEmail,
        to: recipientEmail,
        replyTo: email,
        subject: emailSubject,
      })

      const { data, error } = await resend.emails.send({
        from: `INKOO PRO <${fromEmail}>`,
        to: [recipientEmail],
        replyTo: email, // Permet de répondre directement au client
        subject: emailSubject,
        text: emailBody,
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
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Nouveau message de contact</p>
            </div>
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2d5016;">
                <p style="margin: 5px 0;"><strong style="color: #2d5016;">Type de demande :</strong> ${typeLabel}</p>
                <p style="margin: 5px 0;"><strong style="color: #2d5016;">Nom :</strong> ${name}</p>
                <p style="margin: 5px 0;"><strong style="color: #2d5016;">Email :</strong> <a href="mailto:${email}" style="color: #2d5016; text-decoration: none;">${email}</a></p>
                ${subject ? `<p style="margin: 5px 0;"><strong style="color: #2d5016;">Sujet :</strong> ${subject}</p>` : ''}
              </div>
              <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #4a7c2a; margin: 20px 0;">
                <h3 style="color: #2d5016; margin-top: 0;">Message :</h3>
                <p style="white-space: pre-wrap; line-height: 1.8; color: #333;">${message.replace(/\n/g, '<br>')}</p>
              </div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
                <a href="mailto:${email}?subject=Re: ${encodeURIComponent(emailSubject)}" style="display: inline-block; background-color: #2d5016; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Répondre à ${name}</a>
              </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; text-align: center; color: #666; font-size: 12px;">
              <p style="margin: 5px 0;">Ce message a été envoyé depuis le formulaire de contact INKOO PRO.</p>
              <p style="margin: 5px 0;">Date : ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Brussels' })}</p>
            </div>
          </body>
          </html>
        `,
      })

      if (error) {
        console.error('❌ Erreur Resend:', error)
        throw new Error(`Erreur lors de l'envoi de l'email: ${error.message || 'Erreur inconnue'}`)
      }

      console.log('✅ Email envoyé avec succès via Resend:', data?.id)
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError)
      // Si l'envoi d'email échoue, on retourne une erreur
      // mais on log quand même le message pour ne pas le perdre
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer ou nous contacter directement.',
          details: emailError instanceof Error ? emailError.message : 'Erreur inconnue'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Message envoyé avec succès',
    })
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du message de contact:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de l\'envoi du message',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

