'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { MessageCircle, Send, Loader2 } from 'lucide-react'

interface ContactFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type RequestType = 'pricing' | 'bug' | 'info' | 'improvement' | 'other'

export function ContactForm({ open, onOpenChange }: ContactFormProps) {
  const t = useTranslations('contact')
  const commonT = useTranslations('common')
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: '' as RequestType | '',
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const requestTypes = [
    { value: 'pricing', label: 'Demande de prix one-shot' },
    { value: 'bug', label: 'Signaler un bug' },
    { value: 'info', label: 'Demande d\'informations' },
    { value: 'improvement', label: 'Suggestion d\'amélioration' },
    { value: 'other', label: 'Autre' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.type || !formData.name || !formData.email || !formData.message) {
      toast({
        title: commonT('error'),
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Message envoyé',
          description: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
        })
        // Réinitialiser le formulaire
        setFormData({
          type: '' as RequestType | '',
          name: '',
          email: '',
          subject: '',
          message: '',
        })
        onOpenChange(false)
      } else {
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }
    } catch (error) {
      console.error('Erreur envoi formulaire:', error)
      toast({
        title: commonT('error'),
        description: 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Contactez-nous</DialogTitle>
          <DialogDescription className="text-base">
            Nous sommes là pour vous aider. Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type de demande *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as RequestType })}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Sélectionnez un type de demande" />
              </SelectTrigger>
              <SelectContent>
                {requestTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Votre nom"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Sujet de votre message (optionnel)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <textarea
              id="message"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Décrivez votre demande en détail..."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ContactButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-2xl transition-all hover:scale-110 hover:shadow-3xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 animate-pulse hover:animate-none"
        aria-label="Ouvrir le formulaire de contact"
        title="Contactez-nous"
      >
        <MessageCircle className="h-7 w-7" />
      </button>
      <ContactForm open={open} onOpenChange={setOpen} />
    </>
  )
}

