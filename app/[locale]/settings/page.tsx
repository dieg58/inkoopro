'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save } from 'lucide-react'
import { DeliveryMethod } from '@/types'

export default function SettingsPage() {
  const router = useRouter()
  const t = useTranslations()
  const { toast } = useToast()
  const [defaultDeliveryMethod, setDefaultDeliveryMethod] = useState<DeliveryMethod | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/client/settings')
        const data = await response.json()
        if (data.success && data.settings) {
          setDefaultDeliveryMethod(data.settings.defaultDeliveryMethod || '')
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error)
        toast({
          title: t('common.error'),
          description: t('settings.errorLoading'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convertir "none" en null pour l'API
      const methodToSave = defaultDeliveryMethod === 'none' || defaultDeliveryMethod === '' ? null : defaultDeliveryMethod
      
      const response = await fetch('/api/client/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultDeliveryMethod: methodToSave,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: t('settings.settingsSaved'),
          description: t('settings.settingsSavedDescription'),
        })
      } else {
        console.error('Erreur API:', data)
        throw new Error(data.error || t('settings.errorSaving'))
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast({
        title: t('common.error'),
        description: t('settings.errorSaving'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center">{t('settings.loading')}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => router.push('/')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back')}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.accountSettings')}</CardTitle>
          <CardDescription>
            {t('settings.defaultDeliveryMethodDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="defaultDeliveryMethod">
              {t('settings.defaultDeliveryMethod')}
            </Label>
            <Select
              value={defaultDeliveryMethod || 'none'}
              onValueChange={(value) => setDefaultDeliveryMethod(value === 'none' ? '' : (value as DeliveryMethod))}
            >
              <SelectTrigger id="defaultDeliveryMethod">
                <SelectValue placeholder={t('settings.selectDeliveryMethod')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('settings.noPreference')}</SelectItem>
                <SelectItem value="pickup">{t('delivery.pickup')}</SelectItem>
                <SelectItem value="transporteur">{t('delivery.carrier')}</SelectItem>
                <SelectItem value="coursier">{t('delivery.courier')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('settings.defaultMethodDescription')}
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" />
                  {t('settings.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('settings.saveSettings')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

