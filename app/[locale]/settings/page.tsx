'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save } from 'lucide-react'
import { DeliveryMethod } from '@/types'
import { AVAILABLE_COUNTRIES } from '@/lib/distance'

interface DeliveryAddress {
  street: string
  city: string
  postalCode: string
  country: string
}

export default function SettingsPage() {
  const router = useRouter()
  const t = useTranslations('settings')
  const commonT = useTranslations('common')
  const deliveryT = useTranslations('delivery')
  const { toast } = useToast()
  const [defaultDeliveryMethod, setDefaultDeliveryMethod] = useState<DeliveryMethod | ''>('')
  const [defaultDeliveryAddress, setDefaultDeliveryAddress] = useState<DeliveryAddress | null>(null)
  const [billingAddress, setBillingAddress] = useState<DeliveryAddress | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Charger les settings
        const settingsResponse = await fetch('/api/client/settings')
        const settingsData = await settingsResponse.json()
        if (settingsData.success && settingsData.settings) {
          setDefaultDeliveryMethod(settingsData.settings.defaultDeliveryMethod || '')
          setDefaultDeliveryAddress(settingsData.settings.defaultDeliveryAddress || null)
        }

        // Charger l'adresse de facturation depuis Odoo
        const clientResponse = await fetch('/api/auth/me')
        const clientData = await clientResponse.json()
        if (clientData.success && clientData.client) {
          const client = clientData.client
          if (client.street && client.city && client.zip && client.country) {
            setBillingAddress({
              street: client.street,
              city: client.city,
              postalCode: client.zip,
              country: client.country || 'FR',
            })
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error)
        toast({
          title: commonT('error'),
          description: t('errorLoading'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [toast, t])

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
          defaultDeliveryAddress: defaultDeliveryAddress,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: t('settingsSaved'),
          description: t('settingsSavedDescription'),
        })
      } else {
        console.error('Erreur API:', data)
        throw new Error(data.error || t('errorSaving'))
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast({
        title: commonT('error'),
        description: t('errorSaving'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUseBillingAddress = () => {
    if (billingAddress) {
      setDefaultDeliveryAddress(billingAddress)
    }
  }

  const handleClearDeliveryAddress = () => {
    setDefaultDeliveryAddress(null)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center">{t('loading')}</div>
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
        {commonT('back')}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t('accountSettings')}</CardTitle>
          <CardDescription>
            {t('defaultDeliveryMethodDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="defaultDeliveryMethod">
              {t('defaultDeliveryMethod')}
            </Label>
            <Select
              value={defaultDeliveryMethod || 'none'}
              onValueChange={(value) => setDefaultDeliveryMethod(value === 'none' ? '' : (value as DeliveryMethod))}
            >
              <SelectTrigger id="defaultDeliveryMethod">
                <SelectValue placeholder={t('selectDeliveryMethod')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('noPreference')}</SelectItem>
                <SelectItem value="pickup">{deliveryT('pickup')}</SelectItem>
                <SelectItem value="transporteur">{deliveryT('carrier')}</SelectItem>
                <SelectItem value="coursier">{deliveryT('courier')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('defaultMethodDescription')}
            </p>
          </div>

          {/* Section adresse de livraison par défaut */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Adresse de livraison par défaut</Label>
              <p className="text-sm text-muted-foreground">
                Par défaut, l'adresse de livraison sera celle de facturation (provenant de votre compte Odoo).
                Vous pouvez définir une adresse de livraison différente ci-dessous si nécessaire.
              </p>
            </div>

            {billingAddress && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Adresse de facturation (Odoo)</p>
                <p className="font-medium">{billingAddress.street}</p>
                <p>{billingAddress.postalCode} {billingAddress.city}</p>
                <p className="text-sm text-gray-600">
                  {AVAILABLE_COUNTRIES[billingAddress.country] || billingAddress.country}
                </p>
              </div>
            )}

            {defaultDeliveryAddress ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold">Adresse de livraison personnalisée</Label>
                  <div className="flex gap-2">
                    {billingAddress && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUseBillingAddress}
                      >
                        Utiliser l'adresse de facturation
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearDeliveryAddress}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{deliveryT('street')}</Label>
                  <Input
                    value={defaultDeliveryAddress.street}
                    onChange={(e) =>
                      setDefaultDeliveryAddress({
                        ...defaultDeliveryAddress,
                        street: e.target.value,
                      })
                    }
                    placeholder={deliveryT('street')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{deliveryT('postalCode')}</Label>
                    <Input
                      value={defaultDeliveryAddress.postalCode}
                      onChange={(e) =>
                        setDefaultDeliveryAddress({
                          ...defaultDeliveryAddress,
                          postalCode: e.target.value,
                        })
                      }
                      placeholder={deliveryT('postalCode')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{deliveryT('city')}</Label>
                    <Input
                      value={defaultDeliveryAddress.city}
                      onChange={(e) =>
                        setDefaultDeliveryAddress({
                          ...defaultDeliveryAddress,
                          city: e.target.value,
                        })
                      }
                      placeholder={deliveryT('city')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{deliveryT('country')}</Label>
                  <Select
                    value={defaultDeliveryAddress.country}
                    onValueChange={(value) =>
                      setDefaultDeliveryAddress({
                        ...defaultDeliveryAddress,
                        country: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AVAILABLE_COUNTRIES).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Aucune adresse de livraison personnalisée. L'adresse de facturation sera utilisée par défaut.
                </p>
                {billingAddress && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setDefaultDeliveryAddress({
                        street: '',
                        city: '',
                        postalCode: '',
                        country: billingAddress.country || 'FR',
                      })
                    }
                  >
                    Définir une adresse de livraison différente
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('saveSettings')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

