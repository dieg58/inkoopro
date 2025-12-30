import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ContactRequest {
  type: 'pricing' | 'bug' | 'info' | 'improvement' | 'other'
  name: string
  email: string
  subject?: string
  message: string
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

    // Ici, vous pouvez :
    // 1. Envoyer un email (via un service comme SendGrid, Resend, etc.)
    // 2. Sauvegarder dans une base de données
    // 3. Envoyer à un webhook
    // 4. Envoyer à Odoo comme un ticket/lead

    // Pour l'instant, on log juste le message
    console.log('📧 Nouveau message de contact:', {
      type,
      name,
      email,
      subject,
      message: message.substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
    })

    // TODO: Implémenter l'envoi réel (email, base de données, Odoo, etc.)
    // Exemple avec un service d'email :
    // await sendEmail({
    //   to: 'hello@inkoo.eu',
    //   subject: `[${type}] ${subject || 'Nouveau message'}`,
    //   body: `De: ${name} (${email})\n\n${message}`
    // })

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

