'use client'

import { useState, useEffect } from 'react'
import { ServicePricing, SerigraphiePricing, BroderiePricing, DTFPricing } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Save, Plus, Trash2 } from 'lucide-react'

export function ServicePricingManager() {
  const { toast } = useToast()
  const [pricing, setPricing] = useState<ServicePricing[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPricing()
  }, [])

  const loadPricing = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/service-pricing')
      const data = await response.json()
      if (data.success) {
        setPricing(data.pricing || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des prix:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les prix des services',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const savePricing = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/service-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing }),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Prix des services sauvegardés',
        })
      } else {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les prix',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const updatePrice = (
    technique: 'serigraphie' | 'broderie' | 'dtf',
    key: string,
    value: number
  ) => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        return {
          ...p,
          prices: {
            ...p.prices,
            [key]: value,
          },
        }
      }
      return p
    }))
  }

  const updateMinQuantity = (
    technique: 'serigraphie' | 'broderie' | 'dtf',
    value: number
  ) => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        return { ...p, minQuantity: value }
      }
      return p
    }))
  }

  const addQuantityRange = (technique: 'serigraphie' | 'broderie' | 'dtf') => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        const lastRange = p.quantityRanges[p.quantityRanges.length - 1]
        const newMin = lastRange ? (lastRange.max || lastRange.min) + 1 : 1
        return {
          ...p,
          quantityRanges: [
            ...p.quantityRanges,
            { min: newMin, max: null, label: `${newMin}+` },
          ],
        }
      }
      return p
    }))
  }

  const removeQuantityRange = (
    technique: 'serigraphie' | 'broderie' | 'dtf',
    index: number
  ) => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique && p.quantityRanges.length > 1) {
        const newRanges = p.quantityRanges.filter((_, i) => i !== index)
        // Supprimer les prix associés à cette fourchette
        const newPrices: Record<string, number> = {}
        Object.entries(p.prices).forEach(([key, value]) => {
          if (!key.startsWith(p.quantityRanges[index].label + '-')) {
            newPrices[key] = value
          }
        })
        return {
          ...p,
          quantityRanges: newRanges,
          prices: newPrices,
        }
      }
      return p
    }))
  }

  const addColorCount = (technique: 'serigraphie') => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        const serigraphiePricing = p as SerigraphiePricing
        const newColorCount = Math.max(...serigraphiePricing.colorCounts) + 1
        return {
          ...serigraphiePricing,
          colorCounts: [...serigraphiePricing.colorCounts, newColorCount],
        }
      }
      return p
    }))
  }

  const removeColorCount = (technique: 'serigraphie', colorCount: number) => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        const serigraphiePricing = p as SerigraphiePricing
        const newColorCounts = serigraphiePricing.colorCounts.filter(c => c !== colorCount)
        // Supprimer les prix associés à ce nombre de couleurs
        const newPrices: Record<string, number> = {}
        Object.entries(serigraphiePricing.prices).forEach(([key, value]) => {
          if (!key.endsWith(`-${colorCount}`)) {
            newPrices[key] = value
          }
        })
        return {
          ...serigraphiePricing,
          colorCounts: newColorCounts,
          prices: newPrices,
        }
      }
      return p
    }))
  }

  const addPointRange = (technique: 'broderie') => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        const broderiePricing = p as BroderiePricing
        const lastRange = broderiePricing.pointRanges[broderiePricing.pointRanges.length - 1]
        const newMin = lastRange ? (lastRange.max || lastRange.min) + 1 : 0
        return {
          ...broderiePricing,
          pointRanges: [
            ...broderiePricing.pointRanges,
            { min: newMin, max: null, label: `${newMin}+` },
          ],
        }
      }
      return p
    }))
  }

  const removePointRange = (technique: 'broderie', index: number) => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        const broderiePricing = p as BroderiePricing
        if (broderiePricing.pointRanges.length <= 1) return p
        const newRanges = broderiePricing.pointRanges.filter((_, i) => i !== index)
        // Supprimer les prix associés à cette fourchette
        const rangeToRemove = broderiePricing.pointRanges[index]
        const newPrices: Record<string, number> = {}
        Object.entries(broderiePricing.prices).forEach(([key, value]) => {
          if (!key.endsWith(`-${rangeToRemove.label}`)) {
            newPrices[key] = value
          }
        })
        return {
          ...broderiePricing,
          pointRanges: newRanges,
          prices: newPrices,
        }
      }
      return p
    }))
  }

  const addDimension = (technique: 'dtf') => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        const dtfPricing = p as DTFPricing
        return {
          ...dtfPricing,
          dimensions: [...dtfPricing.dimensions, 'Nouvelle dimension'],
        }
      }
      return p
    }))
  }

  const removeDimension = (technique: 'dtf', dimension: string) => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        const dtfPricing = p as DTFPricing
        const newDimensions = dtfPricing.dimensions.filter(d => d !== dimension)
        // Supprimer les prix associés à cette dimension
        const newPrices: Record<string, number> = {}
        Object.entries(dtfPricing.prices).forEach(([key, value]) => {
          if (!key.endsWith(`-${dimension}`)) {
            newPrices[key] = value
          }
        })
        return {
          ...dtfPricing,
          dimensions: newDimensions,
          prices: newPrices,
        }
      }
      return p
    }))
  }

  const updateDimension = (technique: 'dtf', oldDimension: string, newDimension: string) => {
    setPricing(prev => prev.map(p => {
      if (p.technique === technique) {
        const dtfPricing = p as DTFPricing
        const newDimensions = dtfPricing.dimensions.map(d => d === oldDimension ? newDimension : d)
        // Mettre à jour les clés de prix
        const newPrices: Record<string, number> = {}
        Object.entries(dtfPricing.prices).forEach(([key, value]) => {
          const newKey = key.replace(`-${oldDimension}`, `-${newDimension}`)
          newPrices[newKey] = value
        })
        return {
          ...dtfPricing,
          dimensions: newDimensions,
          prices: newPrices,
        }
      }
      return p
    }))
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  const serigraphiePricing = pricing.find(p => p.technique === 'serigraphie') as SerigraphiePricing | undefined
  const broderiePricing = pricing.find(p => p.technique === 'broderie') as BroderiePricing | undefined
  const dtfPricing = pricing.find(p => p.technique === 'dtf') as DTFPricing | undefined

  return (
    <div className="space-y-6">
      {/* Sérigraphie */}
      {serigraphiePricing && (
        <Card>
          <CardHeader>
            <CardTitle>Sérigraphie - Tableau de prix</CardTitle>
            <CardDescription>
              Configurez les prix selon la quantité et le nombre de couleurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label>Quantité minimum</Label>
                <Input
                  type="number"
                  min="1"
                  value={serigraphiePricing.minQuantity}
                  onChange={(e) => updateMinQuantity('serigraphie', parseInt(e.target.value) || 1)}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label>Frais fixes par couleur (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={serigraphiePricing.fixedFeePerColor || 0}
                  onChange={(e) => {
                    setPricing(prev => prev.map(p => 
                      p.technique === 'serigraphie' 
                        ? { ...p, fixedFeePerColor: parseFloat(e.target.value) || 0 }
                        : p
                    ))
                  }}
                  className="w-32"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Fourchettes de quantités</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addQuantityRange('serigraphie')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une fourchette
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {serigraphiePricing.quantityRanges.map((range, idx) => (
                  <div key={idx} className="flex items-center gap-2 border rounded p-2">
                    <Input
                      type="number"
                      value={range.min}
                      onChange={(e) => {
                        const newRanges = [...serigraphiePricing.quantityRanges]
                        newRanges[idx].min = parseInt(e.target.value) || 0
                        newRanges[idx].label = `${newRanges[idx].min}${newRanges[idx].max ? `-${newRanges[idx].max}` : '+'}`
                        setPricing(prev => prev.map(p => 
                          p.technique === 'serigraphie' 
                            ? { ...p, quantityRanges: newRanges }
                            : p
                        ))
                      }}
                      className="w-20"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      value={range.max || ''}
                      placeholder="∞"
                      onChange={(e) => {
                        const newRanges = [...serigraphiePricing.quantityRanges]
                        newRanges[idx].max = e.target.value ? parseInt(e.target.value) : null
                        newRanges[idx].label = `${newRanges[idx].min}${newRanges[idx].max ? `-${newRanges[idx].max}` : '+'}`
                        setPricing(prev => prev.map(p => 
                          p.technique === 'serigraphie' 
                            ? { ...p, quantityRanges: newRanges }
                            : p
                        ))
                      }}
                      className="w-20"
                    />
                    {serigraphiePricing.quantityRanges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuantityRange('serigraphie', idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Nombre de couleurs</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addColorCount('serigraphie')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une couleur
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {serigraphiePricing.colorCounts.map(colorCount => (
                  <div key={colorCount} className="flex items-center gap-2 border rounded p-2">
                    <span>{colorCount} couleur{colorCount > 1 ? 's' : ''}</span>
                    {serigraphiePricing.colorCounts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeColorCount('serigraphie', colorCount)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tableau croisé */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left sticky left-0 bg-muted">Quantité / Couleurs</th>
                    {serigraphiePricing.colorCounts.map(colorCount => (
                      <th key={colorCount} className="border p-2 text-center min-w-[100px]">
                        {colorCount} couleur{colorCount > 1 ? 's' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serigraphiePricing.quantityRanges.map(range => (
                    <tr key={range.label}>
                      <td className="border p-2 font-medium sticky left-0 bg-background">
                        {range.label}
                      </td>
                      {serigraphiePricing.colorCounts.map(colorCount => {
                        const key = `${range.label}-${colorCount}`
                        return (
                          <td key={colorCount} className="border p-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={serigraphiePricing.prices[key] || ''}
                              onChange={(e) => updatePrice('serigraphie', key, parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full text-center"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Broderie */}
      {broderiePricing && (
        <Card>
          <CardHeader>
            <CardTitle>Broderie - Tableau de prix</CardTitle>
            <CardDescription>
              Configurez les prix selon la quantité et le nombre de points
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-2">
                <Label>Quantité minimum</Label>
                <Input
                  type="number"
                  min="1"
                  value={broderiePricing.minQuantity}
                  onChange={(e) => updateMinQuantity('broderie', parseInt(e.target.value) || 1)}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label>Frais petite digitalisation (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={broderiePricing.fixedFeeSmallDigitization || 0}
                  onChange={(e) => {
                    setPricing(prev => prev.map(p => 
                      p.technique === 'broderie' 
                        ? { ...p, fixedFeeSmallDigitization: parseFloat(e.target.value) || 0 }
                        : p
                    ))
                  }}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Frais grande digitalisation (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={broderiePricing.fixedFeeLargeDigitization || 0}
                  onChange={(e) => {
                    setPricing(prev => prev.map(p => 
                      p.technique === 'broderie' 
                        ? { ...p, fixedFeeLargeDigitization: parseFloat(e.target.value) || 0 }
                        : p
                    ))
                  }}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Seuil digitalisation (points)</Label>
                <Input
                  type="number"
                  min="0"
                  value={broderiePricing.smallDigitizationThreshold || 10000}
                  onChange={(e) => {
                    setPricing(prev => prev.map(p => 
                      p.technique === 'broderie' 
                        ? { ...p, smallDigitizationThreshold: parseInt(e.target.value) || 10000 }
                        : p
                    ))
                  }}
                  className="w-40"
                />
                <p className="text-xs text-muted-foreground">
                  ≤ {broderiePricing.smallDigitizationThreshold || 10000} points = petite, &gt; {broderiePricing.smallDigitizationThreshold || 10000} points = grande
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Fourchettes de quantités</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addQuantityRange('broderie')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une fourchette
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {broderiePricing.quantityRanges.map((range, idx) => (
                  <div key={idx} className="flex items-center gap-2 border rounded p-2">
                    <Input
                      type="number"
                      value={range.min}
                      onChange={(e) => {
                        const newRanges = [...broderiePricing.quantityRanges]
                        newRanges[idx].min = parseInt(e.target.value) || 0
                        newRanges[idx].label = `${newRanges[idx].min}${newRanges[idx].max ? `-${newRanges[idx].max}` : '+'}`
                        setPricing(prev => prev.map(p => 
                          p.technique === 'broderie' 
                            ? { ...p, quantityRanges: newRanges }
                            : p
                        ))
                      }}
                      className="w-20"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      value={range.max || ''}
                      placeholder="∞"
                      onChange={(e) => {
                        const newRanges = [...broderiePricing.quantityRanges]
                        newRanges[idx].max = e.target.value ? parseInt(e.target.value) : null
                        newRanges[idx].label = `${newRanges[idx].min}${newRanges[idx].max ? `-${newRanges[idx].max}` : '+'}`
                        setPricing(prev => prev.map(p => 
                          p.technique === 'broderie' 
                            ? { ...p, quantityRanges: newRanges }
                            : p
                        ))
                      }}
                      className="w-20"
                    />
                    {broderiePricing.quantityRanges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuantityRange('broderie', idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Fourchettes de points</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addPointRange('broderie')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une fourchette
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {broderiePricing.pointRanges.map((range, idx) => (
                  <div key={idx} className="flex items-center gap-2 border rounded p-2">
                    <Input
                      type="number"
                      value={range.min}
                      onChange={(e) => {
                        const newRanges = [...broderiePricing.pointRanges]
                        newRanges[idx].min = parseInt(e.target.value) || 0
                        newRanges[idx].label = `${newRanges[idx].min}${newRanges[idx].max ? `-${newRanges[idx].max}` : '+'}`
                        setPricing(prev => prev.map(p => 
                          p.technique === 'broderie' 
                            ? { ...p, pointRanges: newRanges }
                            : p
                        ))
                      }}
                      className="w-24"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      value={range.max || ''}
                      placeholder="∞"
                      onChange={(e) => {
                        const newRanges = [...broderiePricing.pointRanges]
                        newRanges[idx].max = e.target.value ? parseInt(e.target.value) : null
                        newRanges[idx].label = `${newRanges[idx].min}${newRanges[idx].max ? `-${newRanges[idx].max}` : '+'}`
                        setPricing(prev => prev.map(p => 
                          p.technique === 'broderie' 
                            ? { ...p, pointRanges: newRanges }
                            : p
                        ))
                      }}
                      className="w-24"
                    />
                    {broderiePricing.pointRanges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePointRange('broderie', idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tableau croisé */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left sticky left-0 bg-muted">Quantité / Points</th>
                    {broderiePricing.pointRanges.map(range => (
                      <th key={range.label} className="border p-2 text-center min-w-[120px]">
                        {range.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {broderiePricing.quantityRanges.map(range => (
                    <tr key={range.label}>
                      <td className="border p-2 font-medium sticky left-0 bg-background">
                        {range.label}
                      </td>
                      {broderiePricing.pointRanges.map(pointRange => {
                        const key = `${range.label}-${pointRange.label}`
                        return (
                          <td key={pointRange.label} className="border p-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={broderiePricing.prices[key] || ''}
                              onChange={(e) => updatePrice('broderie', key, parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full text-center"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DTF */}
      {dtfPricing && (
        <Card>
          <CardHeader>
            <CardTitle>DTF - Tableau de prix</CardTitle>
            <CardDescription>
              Configurez les prix selon la quantité et la dimension
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label>Quantité minimum</Label>
                <Input
                  type="number"
                  min="1"
                  value={dtfPricing.minQuantity}
                  onChange={(e) => updateMinQuantity('dtf', parseInt(e.target.value) || 1)}
                  className="w-32"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Fourchettes de quantités</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addQuantityRange('dtf')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une fourchette
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {dtfPricing.quantityRanges.map((range, idx) => (
                  <div key={idx} className="flex items-center gap-2 border rounded p-2">
                    <Input
                      type="number"
                      value={range.min}
                      onChange={(e) => {
                        const newRanges = [...dtfPricing.quantityRanges]
                        newRanges[idx].min = parseInt(e.target.value) || 0
                        newRanges[idx].label = `${newRanges[idx].min}${newRanges[idx].max ? `-${newRanges[idx].max}` : '+'}`
                        setPricing(prev => prev.map(p => 
                          p.technique === 'dtf' 
                            ? { ...p, quantityRanges: newRanges }
                            : p
                        ))
                      }}
                      className="w-20"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      value={range.max || ''}
                      placeholder="∞"
                      onChange={(e) => {
                        const newRanges = [...dtfPricing.quantityRanges]
                        newRanges[idx].max = e.target.value ? parseInt(e.target.value) : null
                        newRanges[idx].label = `${newRanges[idx].min}${newRanges[idx].max ? `-${newRanges[idx].max}` : '+'}`
                        setPricing(prev => prev.map(p => 
                          p.technique === 'dtf' 
                            ? { ...p, quantityRanges: newRanges }
                            : p
                        ))
                      }}
                      className="w-20"
                    />
                    {dtfPricing.quantityRanges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuantityRange('dtf', idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Dimensions</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addDimension('dtf')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une dimension
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {dtfPricing.dimensions.map((dimension, idx) => (
                  <div key={idx} className="flex items-center gap-2 border rounded p-2">
                    <Input
                      type="text"
                      value={dimension}
                      onChange={(e) => updateDimension('dtf', dimension, e.target.value)}
                      className="w-32"
                    />
                    {dtfPricing.dimensions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDimension('dtf', dimension)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tableau croisé */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left sticky left-0 bg-muted">Quantité / Dimension</th>
                    {dtfPricing.dimensions.map(dimension => (
                      <th key={dimension} className="border p-2 text-center min-w-[120px]">
                        {dimension}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dtfPricing.quantityRanges.map(range => (
                    <tr key={range.label}>
                      <td className="border p-2 font-medium sticky left-0 bg-background">
                        {range.label}
                      </td>
                      {dtfPricing.dimensions.map(dimension => {
                        const key = `${range.label}-${dimension}`
                        return (
                          <td key={dimension} className="border p-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={dtfPricing.prices[key] || ''}
                              onChange={(e) => updatePrice('dtf', key, parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full text-center"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Button onClick={savePricing} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder les prix'}
        </Button>
      </div>
    </div>
  )
}

