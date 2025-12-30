'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Save, RefreshCw, Plus, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ServiceOdooFeeMapping } from '@/lib/service-odoo-fee-mapping-db'
import type { DeliveryOdooMapping } from '@/lib/delivery-odoo-mapping-db'
import type { OptionOdooMapping } from '@/lib/option-odoo-mapping-db'

interface ServiceMapping {
  technique: 'serigraphie' | 'broderie' | 'dtf'
  odooProductName: string
  textileType?: 'clair' | 'fonce'
}

export function ServiceOdooMappingManager() {
  const { toast } = useToast()
  const [mappings, setMappings] = useState<ServiceMapping[]>([])
  const [feeMappings, setFeeMappings] = useState<ServiceOdooFeeMapping[]>([])
  const [deliveryMappings, setDeliveryMappings] = useState<DeliveryOdooMapping[]>([])
  const [optionMappings, setOptionMappings] = useState<OptionOdooMapping[]>([])
  const [servicePricing, setServicePricing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMappings()
    loadFeeMappings()
    loadDeliveryMappings()
    loadOptionMappings()
    loadServicePricing()
  }, [])

  const loadMappings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/service-odoo-mapping')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const data = await response.json()
      setMappings(data.mappings || [])
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les mappings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateMapping = (index: number, field: keyof ServiceMapping, value: string) => {
    const updated = [...mappings]
    updated[index] = { ...updated[index], [field]: value }
    setMappings(updated)
  }

  const addSerigraphieMapping = () => {
    // Vérifier si on a déjà les deux types
    const hasClair = mappings.some(m => m.technique === 'serigraphie' && m.textileType === 'clair')
    const hasFonce = mappings.some(m => m.technique === 'serigraphie' && m.textileType === 'fonce')
    
    if (!hasClair) {
      setMappings([...mappings, { technique: 'serigraphie', odooProductName: 'SERIGRAPHIECLAIR', textileType: 'clair' }])
    } else if (!hasFonce) {
      setMappings([...mappings, { technique: 'serigraphie', odooProductName: 'SERIGRAPHIEFONCE', textileType: 'fonce' }])
    }
  }

  const addMapping = (technique: 'broderie' | 'dtf') => {
    if (mappings.some(m => m.technique === technique)) {
      toast({
        title: 'Attention',
        description: `Un mapping pour ${technique} existe déjà`,
        variant: 'destructive',
      })
      return
    }
    setMappings([...mappings, { technique, odooProductName: technique === 'broderie' ? 'BRODERIE' : 'DTFTEXTILE' }])
  }

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index))
  }

  const loadFeeMappings = async () => {
    try {
      const response = await fetch('/api/admin/service-odoo-fee-mapping')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const data = await response.json()
      setFeeMappings(data.mappings || [])
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const loadServicePricing = async () => {
    try {
      const response = await fetch('/api/service-pricing')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const data = await response.json()
      setServicePricing(data.pricing || [])
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const loadDeliveryMappings = async () => {
    try {
      const response = await fetch('/api/admin/delivery-odoo-mapping')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const data = await response.json()
      setDeliveryMappings(data.mappings || [])
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const loadOptionMappings = async () => {
    try {
      const response = await fetch('/api/admin/option-odoo-mapping')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const data = await response.json()
      setOptionMappings(data.mappings || [])
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const updateDeliveryMapping = (index: number, field: keyof DeliveryOdooMapping, value: string) => {
    const updated = [...deliveryMappings]
    updated[index] = { ...updated[index], [field]: value }
    setDeliveryMappings(updated)
  }

  const addDeliveryMapping = (deliveryType: 'pickup' | 'dpd' | 'client_carrier' | 'courier') => {
    if (deliveryMappings.some(m => m.deliveryType === deliveryType)) {
      return
    }
    const defaultCodes: Record<string, string> = {
      'pickup': 'PICKUP',
      'dpd': 'DPD',
      'client_carrier': 'DELIVERYCLIENT',
      'courier': 'COURSIER',
    }
    setDeliveryMappings([...deliveryMappings, { deliveryType, odooProductCode: defaultCodes[deliveryType] || '' }])
  }

  const removeDeliveryMapping = (index: number) => {
    setDeliveryMappings(deliveryMappings.filter((_, i) => i !== index))
  }

  const updateOptionMapping = (index: number, field: keyof OptionOdooMapping, value: string) => {
    const updated = [...optionMappings]
    updated[index] = { ...updated[index], [field]: value }
    setOptionMappings(updated)
  }

  const addOptionMapping = (optionType: 'individualPackaging' | 'newCarton' | 'vectorization') => {
    if (optionMappings.some(m => m.optionType === optionType)) {
      return
    }
    const defaultCodes: Record<string, string> = {
      'individualPackaging': 'EMBALLAGEINDIVIDUEL',
      'newCarton': 'CARTONNEUF',
      'vectorization': 'VECTORISATION',
    }
    setOptionMappings([...optionMappings, { optionType, odooProductCode: defaultCodes[optionType] || '' }])
  }

  const removeOptionMapping = (index: number) => {
    setOptionMappings(optionMappings.filter((_, i) => i !== index))
  }

  const updateFeeMapping = (index: number, field: keyof ServiceOdooFeeMapping, value: string) => {
    const updated = [...feeMappings]
    updated[index] = { ...updated[index], [field]: value as any }
    setFeeMappings(updated)
  }

  const addFeeMapping = (mappingType: 'fixedFee' | 'option', technique: string, feeType?: string, optionId?: string) => {
    setFeeMappings([...feeMappings, {
      mappingType,
      technique: technique as any,
      feeType,
      optionId,
      odooProductName: '',
    }])
  }

  const removeFeeMapping = (index: number) => {
    setFeeMappings(feeMappings.filter((_, i) => i !== index))
  }

  const saveMappings = async () => {
    try {
      setSaving(true)
      console.log('💾 Sauvegarde des mappings:', { mappings, feeMappings, deliveryMappings })
      
      // Sauvegarder les mappings de base
      const response1 = await fetch('/api/admin/service-odoo-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      })

      if (!response1.ok) {
        const errorText = await response1.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `Erreur HTTP ${response1.status}` }
        }
        console.error('❌ Erreur sauvegarde mappings de base:', errorData)
        throw new Error(errorData.error || errorData.details || 'Erreur lors de la sauvegarde des mappings de base')
      }

      const result1 = await response1.json()
      console.log('✅ Mappings de base sauvegardés:', result1)

      // Sauvegarder les mappings de frais fixes et options
      const response2 = await fetch('/api/admin/service-odoo-fee-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: feeMappings }),
      })

      if (!response2.ok) {
        const errorText = await response2.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `Erreur HTTP ${response2.status}` }
        }
        console.error('❌ Erreur sauvegarde mappings de frais/options:', errorData)
        throw new Error(errorData.error || errorData.details || 'Erreur lors de la sauvegarde des mappings de frais/options')
      }

      const result2 = await response2.json()
      console.log('✅ Mappings de frais/options sauvegardés:', result2)

      // Sauvegarder les mappings de livraison
      const response3 = await fetch('/api/admin/delivery-odoo-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: deliveryMappings }),
      })

      if (!response3.ok) {
        const errorText = await response3.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `Erreur HTTP ${response3.status}` }
        }
        console.error('❌ Erreur sauvegarde mappings de livraison:', errorData)
        throw new Error(errorData.error || errorData.details || 'Erreur lors de la sauvegarde des mappings de livraison')
      }

      const result3 = await response3.json()
      console.log('✅ Mappings de livraison sauvegardés:', result3)

      // Sauvegarder les mappings d'options
      const response4 = await fetch('/api/admin/option-odoo-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: optionMappings }),
      })

      if (!response4.ok) {
        const errorText = await response4.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `Erreur HTTP ${response4.status}` }
        }
        console.error('❌ Erreur sauvegarde mappings d\'options:', errorData)
        throw new Error(errorData.error || errorData.details || 'Erreur lors de la sauvegarde des mappings d\'options')
      }

      const result4 = await response4.json()
      console.log('✅ Mappings d\'options sauvegardés:', result4)

      toast({
        title: 'Succès',
        description: 'Tous les mappings sauvegardés avec succès',
      })
    } catch (error) {
      console.error('❌ Erreur complète:', error)
      const errorMessage = error instanceof Error ? error.message : 'Impossible de sauvegarder les mappings'
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapping Services → Produits Odoo</CardTitle>
          <CardDescription>
            Configurez le nom des produits Odoo correspondant à chaque service de marquage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sérigraphie */}
          <div className="space-y-2">
            <Label>Sérigraphie</Label>
            {mappings.filter(m => m.technique === 'serigraphie').length === 0 && (
              <Button variant="outline" size="sm" onClick={addSerigraphieMapping}>
                Ajouter mapping sérigraphie
              </Button>
            )}
            {mappings
              .filter(m => m.technique === 'serigraphie')
              .map((mapping, idx) => {
                const actualIndex = mappings.findIndex(m => m === mapping)
                return (
                  <div key={actualIndex} className="flex items-end gap-2 p-3 border rounded">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Type de textile</Label>
                      <Select
                        value={mapping.textileType || 'clair'}
                        onValueChange={(value) => updateMapping(actualIndex, 'textileType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clair">Clair</SelectItem>
                          <SelectItem value="fonce">Foncé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Nom produit Odoo</Label>
                      <Input
                        value={mapping.odooProductName}
                        onChange={(e) => updateMapping(actualIndex, 'odooProductName', e.target.value)}
                        placeholder="SERIGRAPHIECLAIR"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(actualIndex)}
                    >
                      Supprimer
                    </Button>
                  </div>
                )
              })}
          </div>

          {/* Broderie */}
          <div className="space-y-2">
            <Label>Broderie</Label>
            {!mappings.some(m => m.technique === 'broderie') && (
              <Button variant="outline" size="sm" onClick={() => addMapping('broderie')}>
                Ajouter mapping broderie
              </Button>
            )}
            {mappings
              .filter(m => m.technique === 'broderie')
              .map((mapping) => {
                const actualIndex = mappings.findIndex(m => m === mapping)
                return (
                  <div key={actualIndex} className="flex items-end gap-2 p-3 border rounded">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Nom produit Odoo</Label>
                      <Input
                        value={mapping.odooProductName}
                        onChange={(e) => updateMapping(actualIndex, 'odooProductName', e.target.value)}
                        placeholder="BRODERIE"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(actualIndex)}
                    >
                      Supprimer
                    </Button>
                  </div>
                )
              })}
          </div>

          {/* DTF */}
          <div className="space-y-2">
            <Label>DTF</Label>
            {!mappings.some(m => m.technique === 'dtf') && (
              <Button variant="outline" size="sm" onClick={() => addMapping('dtf')}>
                Ajouter mapping DTF
              </Button>
            )}
            {mappings
              .filter(m => m.technique === 'dtf')
              .map((mapping) => {
                const actualIndex = mappings.findIndex(m => m === mapping)
                return (
                  <div key={actualIndex} className="flex items-end gap-2 p-3 border rounded">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Nom produit Odoo</Label>
                      <Input
                        value={mapping.odooProductName}
                        onChange={(e) => updateMapping(actualIndex, 'odooProductName', e.target.value)}
                        placeholder="DTFTEXTILE"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(actualIndex)}
                    >
                      Supprimer
                    </Button>
                  </div>
                )
              })}
          </div>

          {/* Mappings des frais fixes et options */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold mb-2">Frais fixes et Options</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configurez le nom des produits Odoo correspondant aux frais fixes et options supplémentaires
              </p>
            </div>
          {/* Frais fixes - Sérigraphie */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Frais fixes - Sérigraphie</Label>
            <p className="text-sm text-muted-foreground">Frais fixes par couleur</p>
            {feeMappings
              .filter(m => m.mappingType === 'fixedFee' && m.technique === 'serigraphie' && m.feeType === 'colorFee')
              .map((mapping, idx) => {
                const actualIndex = feeMappings.findIndex(m => m === mapping)
                return (
                  <div key={actualIndex} className="flex items-end gap-2 p-3 border rounded">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Nom produit Odoo (frais fixes par couleur)</Label>
                      <Input
                        value={mapping.odooProductName}
                        onChange={(e) => updateFeeMapping(actualIndex, 'odooProductName', e.target.value)}
                        placeholder="FRAISFIXESERIGRAPHIE"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeeMapping(actualIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            {!feeMappings.some(m => m.mappingType === 'fixedFee' && m.technique === 'serigraphie' && m.feeType === 'colorFee') && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addFeeMapping('fixedFee', 'serigraphie', 'colorFee')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter mapping frais fixes sérigraphie
              </Button>
            )}
          </div>

          {/* Frais fixes - Broderie */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Frais fixes - Broderie</Label>
            <p className="text-sm text-muted-foreground">Frais de digitalisation</p>
            {['smallDigitization', 'largeDigitization'].map(feeType => (
              <div key={feeType} className="space-y-2">
                <Label className="text-sm">
                  {feeType === 'smallDigitization' ? 'Digitalisation petite (≤ 10 000 points)' : 'Digitalisation grande (> 10 000 points)'}
                </Label>
                {feeMappings
                  .filter(m => m.mappingType === 'fixedFee' && m.technique === 'broderie' && m.feeType === feeType)
                  .map((mapping, idx) => {
                    const actualIndex = feeMappings.findIndex(m => m === mapping)
                    return (
                      <div key={actualIndex} className="flex items-end gap-2 p-3 border rounded">
                        <div className="flex-1">
                          <Input
                            value={mapping.odooProductName}
                            onChange={(e) => updateFeeMapping(actualIndex, 'odooProductName', e.target.value)}
                            placeholder={feeType === 'smallDigitization' ? 'FRAISDIGITPETITE' : 'FRAISDIGITGRANDE'}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeeMapping(actualIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                {!feeMappings.some(m => m.mappingType === 'fixedFee' && m.technique === 'broderie' && m.feeType === feeType) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addFeeMapping('fixedFee', 'broderie', feeType)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter mapping {feeType === 'smallDigitization' ? 'petite' : 'grande'}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Options - Sérigraphie */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Options supplémentaires - Sérigraphie</Label>
            <p className="text-sm text-muted-foreground">Mapping des options (Discharge, Gold, Phospho, etc.)</p>
            {(() => {
              const serigraphiePricing = servicePricing.find((p: any) => p.technique === 'serigraphie')
              const availableOptions = serigraphiePricing?.options || []
              
              return availableOptions.map((option: any) => {
                const existingMapping = feeMappings.find(
                  m => m.mappingType === 'option' && m.technique === 'serigraphie' && m.optionId === option.id
                )
                
                if (existingMapping) {
                  const actualIndex = feeMappings.findIndex(m => m === existingMapping)
                  return (
                    <div key={option.id} className="flex items-end gap-2 p-3 border rounded">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">{option.name} ({option.surchargePercentage}%)</Label>
                        <Input
                          value={existingMapping.odooProductName}
                          onChange={(e) => updateFeeMapping(actualIndex, 'odooProductName', e.target.value)}
                          placeholder={`OPTION_${option.id.toUpperCase()}`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeeMapping(actualIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                } else {
                  return (
                    <div key={option.id} className="flex items-end gap-2 p-3 border rounded bg-muted/50">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">{option.name} ({option.surchargePercentage}%)</Label>
                        <Input disabled placeholder="Non mappé" />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addFeeMapping('option', 'serigraphie', undefined, option.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter mapping
                      </Button>
                    </div>
                  )
                }
              })
            })()}
          </div>
          </div>

          {/* Mappings des méthodes de livraison */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold mb-2">Méthodes de livraison</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configurez les références internes (default_code) des produits Odoo correspondant à chaque méthode de livraison
              </p>
            </div>

            {['pickup', 'dpd', 'client_carrier', 'courier'].map(deliveryType => {
              const mapping = deliveryMappings.find(m => m.deliveryType === deliveryType)
              const deliveryLabels: Record<string, string> = {
                'pickup': 'Pick-UP',
                'dpd': 'Livraison via DPD',
                'client_carrier': 'Transporteur du client',
                'courier': 'Coursier en direct',
              }

              if (mapping) {
                const index = deliveryMappings.findIndex(m => m === mapping)
                return (
                  <div key={deliveryType} className="flex items-end gap-2 p-3 border rounded">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">{deliveryLabels[deliveryType]}</Label>
                      <Input
                        value={mapping.odooProductCode}
                        onChange={(e) => updateDeliveryMapping(index, 'odooProductCode', e.target.value)}
                        placeholder={deliveryType.toUpperCase()}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDeliveryMapping(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              } else {
                return (
                  <div key={deliveryType} className="flex items-end gap-2 p-3 border rounded bg-muted/50">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">{deliveryLabels[deliveryType]}</Label>
                      <Input disabled placeholder="Non mappé" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addDeliveryMapping(deliveryType as any)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter mapping
                    </Button>
                  </div>
                )
              }
              })}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { loadMappings(); loadFeeMappings(); loadDeliveryMappings(); loadOptionMappings(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recharger
            </Button>
            <Button onClick={saveMappings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Options (Emballage, Cartons, Vectorisation)</CardTitle>
          <CardDescription>
            Configurez les références internes (default_code) des produits Odoo correspondant à chaque option
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {['individualPackaging', 'newCarton', 'vectorization'].map(optionType => {
            const mapping = optionMappings.find(m => m.optionType === optionType)
            const optionLabels: Record<string, string> = {
              'individualPackaging': 'Emballage individuel',
              'newCarton': 'Carton neuf',
              'vectorization': 'Vectorisation',
            }

            if (mapping) {
              const index = optionMappings.findIndex(m => m === mapping)
              return (
                <div key={optionType} className="flex items-end gap-2 p-3 border rounded">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">{optionLabels[optionType]}</Label>
                    <Input
                      value={mapping.odooProductCode}
                      onChange={(e) => updateOptionMapping(index, 'odooProductCode', e.target.value)}
                      placeholder={optionType.toUpperCase()}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOptionMapping(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            } else {
              return (
                <div key={optionType} className="flex items-end gap-2 p-3 border rounded bg-muted/50">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">{optionLabels[optionType]}</Label>
                    <Input disabled placeholder="Non mappé" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addOptionMapping(optionType as any)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter mapping
                  </Button>
                </div>
              )
            }
          })}
        </CardContent>
      </Card>
    </div>
  )
}

