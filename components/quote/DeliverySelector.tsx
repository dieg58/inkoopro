'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Delivery } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Edit2, Loader2, Check, X } from 'lucide-react'
import { AVAILABLE_COUNTRIES } from '@/lib/distance'

interface DeliverySelectorProps {
  delivery: Delivery
  onDeliveryChange: (delivery: Delivery) => void
}

export function DeliverySelector({
  delivery,
  onDeliveryChange,
}: DeliverySelectorProps) {
  const t = useTranslations('delivery')
  const commonT = useTranslations('common')
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [editedAddress, setEditedAddress] = useState(delivery.address)
  const [billingAddressFromOdoo, setBillingAddressFromOdoo] = useState<{
    street: string
    city: string
    postalCode: string
    country: string
  } | null>(null)
  const [courierDistance, setCourierDistance] = useState<number | null>(null)
  const [courierDistanceLoading, setCourierDistanceLoading] = useState(false)
  const [courierPrice, setCourierPrice] = useState<number | null>(null)
  const [pricingConfig, setPricingConfig] = useState<{
    courierPricePerKm?: number
    courierMinimumFee?: number
  }>({
    courierPricePerKm: undefined,
    courierMinimumFee: undefined,
  })

  // Synchroniser editedAddress quand delivery.address change (si on n'est pas en mode édition)
  useEffect(() => {
    if (!isEditingAddress) {
      setEditedAddress(delivery.address)
    }
  }, [delivery.address, isEditingAddress])

  // Charger l'adresse de facturation depuis Odoo et l'adresse de livraison par défaut depuis les settings
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        // Charger l'adresse de facturation depuis Odoo
        const clientResponse = await fetch('/api/auth/me')
        const clientData = await clientResponse.json()
        let billingAddress: { street: string; city: string; postalCode: string; country: string } | null = null
        
        if (clientData.success && clientData.client) {
          const client = clientData.client
          if (client.street && client.city && client.zip && client.country) {
            billingAddress = {
              street: client.street,
              city: client.city,
              postalCode: client.zip,
              country: client.country || 'FR', // Code pays (BE, FR, etc.)
            }
            setBillingAddressFromOdoo(billingAddress)
            // Mettre à jour delivery avec l'adresse de facturation d'Odoo
            onDeliveryChange({
              ...delivery,
              billingAddress: billingAddress,
            })
          }
        }

        // Charger l'adresse de livraison par défaut depuis les settings
        const settingsResponse = await fetch('/api/client/settings')
        const settingsData = await settingsResponse.json()
        if (settingsData.success && settingsData.settings) {
          const defaultDeliveryAddress = settingsData.settings.defaultDeliveryAddress as {
            street: string
            city: string
            postalCode: string
            country: string
          } | null

          // Utiliser l'adresse personnalisée si elle existe, sinon utiliser l'adresse de facturation
          const addressToUse = defaultDeliveryAddress || billingAddress

          // Si l'adresse de livraison n'est pas encore définie dans delivery, utiliser l'adresse par défaut
          // On vérifie aussi si delivery.address existe déjà pour ne pas écraser une adresse déjà saisie
          if (addressToUse && (!delivery.address || !delivery.address.street || !delivery.address.city)) {
            onDeliveryChange({
              ...delivery,
              address: addressToUse,
            })
          }
        }
      } catch (error) {
        console.error('Erreur chargement adresses:', error)
      }
    }
    loadAddresses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Seulement au montage

  // Charger la configuration des prix pour le coursier
  useEffect(() => {
    const loadPricingConfig = async () => {
      try {
        const response = await fetch('/api/pricing-config')
        const data = await response.json()
        if (data.success && data.config) {
          setPricingConfig({
            courierPricePerKm: data.config.courierPricePerKm,
            courierMinimumFee: data.config.courierMinimumFee,
          })
        }
      } catch (error) {
        console.error('Erreur chargement config prix:', error)
      }
    }
    loadPricingConfig()
  }, [])

  // Calculer la distance et le prix pour le coursier quand l'adresse change
  const calculateCourierDistance = async () => {
    if (!delivery.address) return
    
    setCourierDistanceLoading(true)
    try {
      const response = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: delivery.address }),
      })
      
      const data = await response.json()
      
      if (data.success && data.distance) {
        const distance = data.distance
        setCourierDistance(distance)
        
        // Calculer le prix
        const pricePerKm = pricingConfig.courierPricePerKm || 1.50
        const minimumFee = pricingConfig.courierMinimumFee || 15.00
        
        const calculatedPrice = distance * pricePerKm
        const finalPrice = Math.max(calculatedPrice, minimumFee)
        setCourierPrice(finalPrice)
      } else {
        setCourierDistance(null)
        setCourierPrice(null)
      }
    } catch (error) {
      console.error('Erreur calcul distance coursier:', error)
      setCourierDistance(null)
      setCourierPrice(null)
    } finally {
      setCourierDistanceLoading(false)
    }
  }

  useEffect(() => {
    if (delivery.type === 'courier' && delivery.address?.street && delivery.address?.city && delivery.address?.postalCode && pricingConfig) {
      calculateCourierDistance()
    } else {
      setCourierDistance(null)
      setCourierPrice(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery.type, delivery.address?.street, delivery.address?.city, delivery.address?.postalCode, pricingConfig])

  // Vérifier si l'adresse est complète (pré-remplie depuis Odoo)
  const hasCompleteAddress = delivery.address?.street && delivery.address?.city && delivery.address?.postalCode

  const handleEditAddress = () => {
    setEditedAddress(delivery.address || {
      street: '',
      city: '',
      postalCode: '',
      country: 'FR',
    })
    setIsEditingAddress(true)
  }

  const handleSaveAddress = () => {
    onDeliveryChange({
      ...delivery,
      address: editedAddress,
    })
    setIsEditingAddress(false)
  }

  const handleCancelEdit = () => {
    setEditedAddress(delivery.address)
    setIsEditingAddress(false)
  }


  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base mb-3">{t('deliveryType')}</h3>
        <Card>
          <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>{t('deliveryType')}</Label>
            <Select
              value={delivery.type}
              onValueChange={(value) => {
                const newType = value as 'pickup' | 'dpd' | 'client_carrier' | 'courier'
                // Réinitialiser l'adresse si ce n'est pas nécessaire pour ce type
                const needsAddress = newType === 'dpd' || newType === 'courier'
                onDeliveryChange({
                  ...delivery,
                  type: newType,
                  // Supprimer l'adresse si elle n'est pas nécessaire
                  address: needsAddress ? delivery.address : undefined,
                })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Pick-UP</SelectItem>
                <SelectItem value="dpd">Livraison via DPD</SelectItem>
                <SelectItem value="client_carrier">Transporteur du client</SelectItem>
                <SelectItem value="courier">Coursier en direct</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Afficher l'adresse uniquement pour DPD et Coursier */}
          {(delivery.type === 'dpd' || delivery.type === 'courier') && (
            <div className="space-y-4 pt-4 border-t">
              {hasCompleteAddress && !isEditingAddress ? (
                // Mode affichage avec bouton d'édition
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Label className="text-sm text-gray-500 mb-2 block">{t('address')}</Label>
                      <div className="bg-gray-50 p-4 rounded-md space-y-1">
                        <p className="font-medium">{delivery.address?.street}</p>
                        <p>{delivery.address?.postalCode} {delivery.address?.city}</p>
                        <p className="text-sm text-gray-600">{delivery.address?.country}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditAddress}
                      className="ml-2"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // Mode édition
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>{t('address')}</Label>
                    {hasCompleteAddress && isEditingAddress && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveAddress}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('street')}</Label>
                    <Input
                      value={editedAddress?.street || ''}
                      onChange={(e) =>
                        setEditedAddress({
                          ...editedAddress,
                          street: e.target.value,
                          city: editedAddress?.city || '',
                          postalCode: editedAddress?.postalCode || '',
                          country: editedAddress?.country || 'FR',
                        })
                      }
                      placeholder={t('street')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('postalCode')}</Label>
                      <Input
                        value={editedAddress?.postalCode || ''}
                        onChange={(e) =>
                          setEditedAddress({
                            ...editedAddress,
                            postalCode: e.target.value,
                            street: editedAddress?.street || '',
                            city: editedAddress?.city || '',
                            country: editedAddress?.country || 'FR',
                          })
                        }
                        placeholder={t('postalCode')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('city')}</Label>
                      <Input
                        value={editedAddress?.city || ''}
                        onChange={(e) =>
                          setEditedAddress({
                            ...editedAddress,
                            city: e.target.value,
                            street: editedAddress?.street || '',
                            postalCode: editedAddress?.postalCode || '',
                            country: editedAddress?.country || 'FR',
                          })
                        }
                        placeholder={t('city')}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('country')}</Label>
                    <Select
                      value={editedAddress?.country || 'FR'}
                      onValueChange={(value) =>
                        setEditedAddress({
                          ...editedAddress,
                          country: value,
                          street: editedAddress?.street || '',
                          city: editedAddress?.city || '',
                          postalCode: editedAddress?.postalCode || '',
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
                  {!hasCompleteAddress && (
                    <Button onClick={handleSaveAddress} className="w-full">
                      {commonT('save')} {t('address')}
                    </Button>
                  )}
                  
                  {/* Affichage de la distance et du prix pour le coursier */}
                  {delivery.type === 'courier' && hasCompleteAddress && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      {courierDistanceLoading ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Calcul de la distance en cours...</span>
                        </div>
                      ) : courierDistance !== null && courierPrice !== null ? (
                        <div className="space-y-1 text-sm">
                          <div className="font-medium">
                            Distance : {courierDistance} km
                          </div>
                          <div className="text-muted-foreground">
                            Frais de livraison : {courierPrice.toFixed(2)} € HT
                            {courierPrice === (pricingConfig.courierMinimumFee || 15.00) && (
                              <span className="ml-2 text-xs">(forfait minimum)</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Impossible de calculer la distance. Vérifiez que l'adresse est complète.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Section adresse de facturation (depuis Odoo) */}
              <div className="pt-4 border-t">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t('billingAddress')}</Label>
                    {billingAddressFromOdoo ? (
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md space-y-1">
                        <p className="font-medium">{billingAddressFromOdoo.street}</p>
                        <p>{billingAddressFromOdoo.postalCode} {billingAddressFromOdoo.city}</p>
                        <p className="text-sm text-gray-600">
                          {AVAILABLE_COUNTRIES[billingAddressFromOdoo.country] || billingAddressFromOdoo.country}
                        </p>
                                <p className="text-xs text-muted-foreground mt-2">
                          Adresse de facturation provenant de votre compte Odoo
                        </p>
                        </div>
                      ) : (
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md text-sm text-muted-foreground">
                        Chargement de l'adresse de facturation depuis votre compte Odoo...
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  )
}

