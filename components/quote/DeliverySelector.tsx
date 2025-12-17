'use client'

import { useState, useEffect } from 'react'
import { Delivery, Delay } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { delayOptions } from '@/lib/data'
import { Edit2, Check, X, AlertCircle } from 'lucide-react'
import { getIndicationDate, getDeliveryDate, formatDate, formatDateShort, calculateExpressSurcharge } from '@/lib/delivery-dates'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DeliverySelectorProps {
  delivery: Delivery
  onDeliveryChange: (delivery: Delivery) => void
  delay: Delay
  onDelayChange: (delay: Delay) => void
}

export function DeliverySelector({
  delivery,
  onDeliveryChange,
  delay,
  onDelayChange,
}: DeliverySelectorProps) {
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [editedAddress, setEditedAddress] = useState(delivery.address)
  const [isEditingBillingAddress, setIsEditingBillingAddress] = useState(false)
  const [editedBillingAddress, setEditedBillingAddress] = useState(delivery.billingAddress)

  // Synchroniser editedAddress quand delivery.address change (si on n'est pas en mode édition)
  useEffect(() => {
    if (!isEditingAddress) {
      setEditedAddress(delivery.address)
    }
  }, [delivery.address, isEditingAddress])

  // Synchroniser editedBillingAddress quand delivery.billingAddress change (si on n'est pas en mode édition)
  useEffect(() => {
    if (!isEditingBillingAddress) {
      setEditedBillingAddress(delivery.billingAddress)
    }
  }, [delivery.billingAddress, isEditingBillingAddress])

  // Vérifier si l'adresse est complète (pré-remplie depuis Odoo)
  const hasCompleteAddress = delivery.address?.street && delivery.address?.city && delivery.address?.postalCode

  const handleEditAddress = () => {
    setEditedAddress(delivery.address || {
      street: '',
      city: '',
      postalCode: '',
      country: 'France',
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

  const handleEditBillingAddress = () => {
    // Utiliser billingAddress si différent, sinon utiliser address
    const addressToEdit = delivery.billingAddressDifferent 
      ? delivery.billingAddress 
      : delivery.address
    setEditedBillingAddress(addressToEdit || {
      street: '',
      city: '',
      postalCode: '',
      country: 'France',
    })
    setIsEditingBillingAddress(true)
  }

  const handleSaveBillingAddress = () => {
    onDeliveryChange({
      ...delivery,
      billingAddress: editedBillingAddress,
    })
    setIsEditingBillingAddress(false)
  }

  const handleCancelEditBilling = () => {
    setEditedBillingAddress(delivery.billingAddress)
    setIsEditingBillingAddress(false)
  }

  // Vérifier si l'adresse de facturation est complète
  // Si billingAddressDifferent est false, utiliser l'adresse de livraison
  const billingAddressToCheck = delivery.billingAddressDifferent 
    ? delivery.billingAddress 
    : delivery.address
  const hasCompleteBillingAddress = billingAddressToCheck?.street && billingAddressToCheck?.city && billingAddressToCheck?.postalCode

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>7. Livraison ou retrait</CardTitle>
          <CardDescription>Choisissez comment vous souhaitez recevoir votre commande</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type de livraison</Label>
            <Select
              value={delivery.type}
              onValueChange={(value) =>
                onDeliveryChange({
                  ...delivery,
                  type: value as 'livraison' | 'pickup',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="livraison">Livraison</SelectItem>
                <SelectItem value="pickup">Retrait sur place</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {delivery.type === 'livraison' && (
            <div className="space-y-4 pt-4 border-t">
              {hasCompleteAddress && !isEditingAddress ? (
                // Mode affichage avec bouton d'édition
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Label className="text-sm text-gray-500 mb-2 block">Adresse de livraison</Label>
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
                    <Label>Adresse de livraison</Label>
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
                    <Label>Rue</Label>
                    <Input
                      value={editedAddress?.street || ''}
                      onChange={(e) =>
                        setEditedAddress({
                          ...editedAddress,
                          street: e.target.value,
                          city: editedAddress?.city || '',
                          postalCode: editedAddress?.postalCode || '',
                          country: editedAddress?.country || 'France',
                        })
                      }
                      placeholder="Rue et numéro"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Code postal</Label>
                      <Input
                        value={editedAddress?.postalCode || ''}
                        onChange={(e) =>
                          setEditedAddress({
                            ...editedAddress,
                            postalCode: e.target.value,
                            street: editedAddress?.street || '',
                            city: editedAddress?.city || '',
                            country: editedAddress?.country || 'France',
                          })
                        }
                        placeholder="Code postal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ville</Label>
                      <Input
                        value={editedAddress?.city || ''}
                        onChange={(e) =>
                          setEditedAddress({
                            ...editedAddress,
                            city: e.target.value,
                            street: editedAddress?.street || '',
                            postalCode: editedAddress?.postalCode || '',
                            country: editedAddress?.country || 'France',
                          })
                        }
                        placeholder="Ville"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Input
                      value={editedAddress?.country || 'France'}
                      onChange={(e) =>
                        setEditedAddress({
                          ...editedAddress,
                          country: e.target.value,
                          street: editedAddress?.street || '',
                          city: editedAddress?.city || '',
                          postalCode: editedAddress?.postalCode || '',
                        })
                      }
                      placeholder="Pays"
                    />
                  </div>
                  {!hasCompleteAddress && (
                    <Button onClick={handleSaveAddress} className="w-full">
                      Enregistrer l'adresse
                    </Button>
                  )}
                </div>
              )}

              {/* Section adresse de facturation */}
              <div className="pt-4 border-t">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="billingAddressDifferent"
                      checked={delivery.billingAddressDifferent || false}
                      onChange={(e) => {
                        onDeliveryChange({
                          ...delivery,
                          billingAddressDifferent: e.target.checked,
                          // Si on décoche, utiliser l'adresse de livraison comme adresse de facturation
                          billingAddress: e.target.checked ? delivery.billingAddress : delivery.address,
                        })
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="billingAddressDifferent" className="cursor-pointer">
                      L'adresse de facturation est différente de l'adresse de livraison
                    </Label>
                  </div>

                  {/* Afficher l'adresse de facturation (toujours visible) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Adresse de facturation</Label>
                    {(() => {
                      // Déterminer quelle adresse afficher
                      const addressToShow = !delivery.billingAddressDifferent 
                        ? delivery.address 
                        : delivery.billingAddress
                      
                      // Vérifier si l'adresse est vide ou incomplète
                      const hasAddress = addressToShow && (addressToShow.street || addressToShow.city || addressToShow.postalCode)
                      
                      if (!hasAddress) {
                        // Pas d'adresse disponible
                        return (
                          <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md text-sm text-muted-foreground">
                            Aucune adresse de facturation disponible. Veuillez remplir l'adresse de livraison d'abord.
                          </div>
                        )
                      }
                      
                      if (!delivery.billingAddressDifferent) {
                        // Si identique, afficher l'adresse avec indication et possibilité de modifier
                        return (
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md space-y-1">
                                  <p className="font-medium">{addressToShow.street || 'Non renseigné'}</p>
                                  <p>{addressToShow.postalCode || ''} {addressToShow.city || ''}</p>
                                  <p className="text-sm text-gray-600">{addressToShow.country || 'France'}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Identique à l'adresse de livraison
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Cocher la checkbox et passer en mode édition
                                  const newBillingAddress = delivery.billingAddress || delivery.address
                                  setEditedBillingAddress(newBillingAddress || {
                                    street: '',
                                    city: '',
                                    postalCode: '',
                                    country: 'France',
                                  })
                                  setIsEditingBillingAddress(true)
                                  onDeliveryChange({
                                    ...delivery,
                                    billingAddressDifferent: true,
                                    billingAddress: newBillingAddress,
                                  })
                                }}
                                className="ml-2"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      }
                      
                      // Si différente, afficher normalement
                      return hasCompleteBillingAddress && !isEditingBillingAddress ? (
                        // Mode affichage avec bouton d'édition
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md space-y-1">
                                <p className="font-medium">{delivery.billingAddress?.street}</p>
                                <p>{delivery.billingAddress?.postalCode} {delivery.billingAddress?.city}</p>
                                <p className="text-sm text-gray-600">{delivery.billingAddress?.country}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEditBillingAddress}
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
                          {hasCompleteBillingAddress && isEditingBillingAddress && (
                            <div className="flex gap-2 ml-auto">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveBillingAddress}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEditBilling}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Rue</Label>
                          <Input
                            value={editedBillingAddress?.street || ''}
                            onChange={(e) =>
                              setEditedBillingAddress({
                                ...editedBillingAddress,
                                street: e.target.value,
                                city: editedBillingAddress?.city || '',
                                postalCode: editedBillingAddress?.postalCode || '',
                                country: editedBillingAddress?.country || 'France',
                              })
                            }
                            placeholder="Rue et numéro"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Code postal</Label>
                            <Input
                              value={editedBillingAddress?.postalCode || ''}
                              onChange={(e) =>
                                setEditedBillingAddress({
                                  ...editedBillingAddress,
                                  postalCode: e.target.value,
                                  street: editedBillingAddress?.street || '',
                                  city: editedBillingAddress?.city || '',
                                  country: editedBillingAddress?.country || 'France',
                                })
                              }
                              placeholder="Code postal"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ville</Label>
                            <Input
                              value={editedBillingAddress?.city || ''}
                              onChange={(e) =>
                                setEditedBillingAddress({
                                  ...editedBillingAddress,
                                  city: e.target.value,
                                  street: editedBillingAddress?.street || '',
                                  postalCode: editedBillingAddress?.postalCode || '',
                                  country: editedBillingAddress?.country || 'France',
                                })
                              }
                              placeholder="Ville"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Pays</Label>
                          <Input
                            value={editedBillingAddress?.country || 'France'}
                            onChange={(e) =>
                              setEditedBillingAddress({
                                ...editedBillingAddress,
                                country: e.target.value,
                                street: editedBillingAddress?.street || '',
                                city: editedBillingAddress?.city || '',
                                postalCode: editedBillingAddress?.postalCode || '',
                              })
                            }
                            placeholder="Pays"
                          />
                        </div>
                        {!hasCompleteBillingAddress && (
                          <Button onClick={handleSaveBillingAddress} className="w-full">
                            Enregistrer l'adresse de facturation
                          </Button>
                        )}
                      </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Délai de livraison</CardTitle>
          <CardDescription>Choisissez le délai souhaité</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Délai</Label>
            <Select
              value={delay.isExpress ? 'express' : `${delay.workingDays}`}
              onValueChange={(value) => {
                if (value === 'express') {
                  const expressDelay = delayOptions.find(d => d.isExpress)
                  if (expressDelay) {
                    onDelayChange(expressDelay)
                  }
                } else {
                  const workingDays = parseInt(value)
                  const selectedDelay = delayOptions.find(d => d.type === 'standard' && d.workingDays === workingDays)
                  if (selectedDelay) {
                    onDelayChange(selectedDelay)
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {delayOptions.map((option, index) => {
                  if (option.isExpress) {
                    return (
                      <SelectItem key={`express-${index}`} value="express">
                        Express (jusqu'à 24h - soumis à approbation)
                      </SelectItem>
                    )
                  } else {
                    return (
                      <SelectItem key={`standard-${option.workingDays}-${index}`} value={`${option.workingDays}`}>
                        {option.workingDays} jour{option.workingDays > 1 ? 's' : ''} ouvrable{option.workingDays > 1 ? 's' : ''}
                      </SelectItem>
                    )
                  }
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Dates d'indication et de livraison */}
          <div className="space-y-2 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Date d'indication</Label>
                <p className="font-medium">{formatDateShort(getIndicationDate())}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Date de livraison estimée</Label>
                <p className="font-medium">{formatDateShort(getDeliveryDate(delay))}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(getDeliveryDate(delay))}
                </p>
              </div>
            </div>
          </div>

          {/* Avertissement pour l'express */}
          {delay.isExpress && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Délai express :</strong> Ce délai est soumis à approbation en fonction du planning. 
                Un supplément de {calculateExpressSurcharge(10, delay.expressDays || 1).toFixed(0)}% 
                sera appliqué sur le marquage.
              </AlertDescription>
            </Alert>
          )}

          {/* Avertissement pour les délais courts (moins de 10 jours) */}
          {!delay.isExpress && delay.workingDays < 10 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Délai réduit :</strong> Un supplément de {calculateExpressSurcharge(10, delay.workingDays).toFixed(0)}% 
                sera appliqué sur le marquage pour ce délai de {delay.workingDays} jour{delay.workingDays > 1 ? 's' : ''} ouvrable{delay.workingDays > 1 ? 's' : ''}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

