'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Save, RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ServiceMapping {
  technique: 'serigraphie' | 'broderie' | 'dtf'
  odooProductName: string
  textileType?: 'clair' | 'fonce'
}

export function ServiceOdooMappingManager() {
  const { toast } = useToast()
  const [mappings, setMappings] = useState<ServiceMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMappings()
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

  const saveMappings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/service-odoo-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      })

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

      toast({
        title: 'Succès',
        description: 'Mappings sauvegardés avec succès',
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les mappings',
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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={loadMappings}>
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
    </div>
  )
}

