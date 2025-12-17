'use client'

import { useState, useEffect } from 'react'
import { PricingConfig } from '@/lib/pricing-config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Save } from 'lucide-react'

export function PricingConfigManager() {
  const { toast } = useToast()
  const [config, setConfig] = useState<PricingConfig>({
    textileDiscountPercentage: 30,
    clientProvidedIndexation: 10,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/pricing-config')
      const data = await response.json()
      if (data.success) {
        setConfig(data.config || {
          textileDiscountPercentage: 30,
          clientProvidedIndexation: 10,
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la configuration des prix',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/pricing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Configuration des prix sauvegardée',
        })
      } else {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la configuration',
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
          <CardTitle>Configuration des facteurs de prix</CardTitle>
          <CardDescription>
            Configurez les facteurs de prix appliqués aux produits et services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="textileDiscount">
                Réduction textile (%)
              </Label>
              <Input
                id="textileDiscount"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={config.textileDiscountPercentage}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    textileDiscountPercentage: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Pourcentage de réduction appliqué sur les prix des produits textiles (affiché au client).
                Exemple : 30 pour 30% de réduction.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientProvidedIndexation">
                Indexation produit fourni par le client (%)
              </Label>
              <Input
                id="clientProvidedIndexation"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={config.clientProvidedIndexation}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    clientProvidedIndexation: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Pourcentage d'indexation appliqué quand le client fournit le produit textile.
                Ce supplément n'est <strong>pas affiché</strong> au client (prix affiché = 0€),
                mais est appliqué lors de l'envoi à Odoo.
                Exemple : 10 pour 10% d'indexation.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={saveConfig} disabled={saving} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

