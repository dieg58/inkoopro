'use client'

import { useState, useEffect } from 'react'
import { PricingConfig } from '@/lib/pricing-config-db'
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
    expressSurchargePercent: 10,
    individualPackagingPrice: 0.10,
    newCartonPrice: 2.00,
    vectorizationPrice: 25.00,
    courierPricePerKm: 1.50,
    courierMinimumFee: 15.00,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      console.log('📥 Chargement de la configuration des prix...')
      
      // Ajouter un timeout pour éviter que ça reste bloqué
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // Timeout de 10 secondes
      
      // Ajouter un paramètre pour forcer le rechargement et éviter le cache
      const response = await fetch('/api/admin/pricing-config?refresh=true', {
        signal: controller.signal,
        cache: 'no-store', // Désactiver le cache du navigateur
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📥 Réponse API:', data)
      
      if (data.success && data.config) {
        // S'assurer que toutes les valeurs sont définies
        setConfig({
          textileDiscountPercentage: data.config.textileDiscountPercentage ?? 30,
          clientProvidedIndexation: data.config.clientProvidedIndexation ?? 10,
          expressSurchargePercent: data.config.expressSurchargePercent ?? 10,
          individualPackagingPrice: data.config.individualPackagingPrice ?? 0.10,
          newCartonPrice: data.config.newCartonPrice ?? 2.00,
          vectorizationPrice: data.config.vectorizationPrice ?? 25.00,
          courierPricePerKm: data.config.courierPricePerKm ?? 1.50,
          courierMinimumFee: data.config.courierMinimumFee ?? 15.00,
        })
        console.log('✅ Configuration chargée avec succès')
      } else {
        console.warn('⚠️ Réponse API invalide ou config manquante:', data)
        toast({
          title: 'Avertissement',
          description: 'La configuration par défaut sera utilisée',
          variant: 'default',
        })
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la configuration:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      
      // Si c'est un timeout ou une erreur réseau
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        toast({
          title: 'Erreur de connexion',
          description: 'La requête a pris trop de temps ou a échoué. Vérifiez votre connexion.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Erreur',
          description: `Impossible de charger la configuration: ${errorMessage}`,
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    try {
      setSaving(true)
      console.log('💾 Envoi de la configuration:', config)
      const response = await fetch('/api/admin/pricing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
        cache: 'no-store', // Désactiver le cache du navigateur
      })
      
      // Lire la réponse une seule fois
      const responseText = await response.text()
      let data
      try {
        data = JSON.parse(responseText)
      } catch {
        // Si ce n'est pas du JSON, traiter comme erreur
        throw new Error(responseText || `Erreur HTTP ${response.status}`)
      }
      
      console.log('📥 Réponse de l\'API:', data)
      
      if (!response.ok) {
        const errorMsg = data.details || data.error || `Erreur HTTP ${response.status}`
        throw new Error(errorMsg)
      }
      
      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Configuration des prix sauvegardée avec succès',
        })
        // Recharger la configuration après la sauvegarde pour afficher les dernières valeurs
        await loadConfig()
      } else {
        const errorMsg = data.details || data.error || 'Erreur lors de la sauvegarde'
        console.error('❌ Erreur retournée par l\'API:', data)
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error)
      let errorMessage = 'Erreur inconnue'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // Afficher un message d'erreur plus détaillé
      toast({
        title: 'Erreur de sauvegarde',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000, // Afficher plus longtemps pour pouvoir lire le message
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

            <div className="space-y-2">
              <Label htmlFor="expressSurchargePercent">
                Supplément express par jour (%)
              </Label>
              <Input
                id="expressSurchargePercent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={config.expressSurchargePercent || 10}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    expressSurchargePercent: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Pourcentage de supplément appliqué par jour de réduction du délai standard.
                Exemple : 10 pour 10% par jour.
              </p>
            </div>
          </div>

          {/* Options de livraison */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Options de livraison</h3>
            
            <div className="space-y-2">
              <Label htmlFor="individualPackagingPrice">
                Prix emballage individuel (€ HT par pièce)
              </Label>
              <Input
                id="individualPackagingPrice"
                type="number"
                min="0"
                step="0.01"
                value={config.individualPackagingPrice || 0}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    individualPackagingPrice: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Prix par pièce pour le conditionnement sous pochette plastique.
                Exemple : 0.10 pour 0,10€ par pièce.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newCartonPrice">
                Prix carton neuf (€ HT par carton)
              </Label>
              <Input
                id="newCartonPrice"
                type="number"
                min="0"
                step="0.01"
                value={config.newCartonPrice || 0}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    newCartonPrice: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Prix par carton pour l'utilisation d'un carton neuf au lieu d'un carton réutilisé.
                Exemple : 2.00 pour 2,00€ par carton.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courierPricePerKm">
                Prix coursier par km (€ HT)
              </Label>
              <Input
                id="courierPricePerKm"
                type="number"
                min="0"
                step="0.01"
                value={config.courierPricePerKm || 0}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    courierPricePerKm: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Prix par kilomètre pour la livraison par coursier.
                Exemple : 1.50 pour 1,50€ par km.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courierMinimumFee">
                Forfait minimum coursier (€ HT)
              </Label>
              <Input
                id="courierMinimumFee"
                type="number"
                min="0"
                step="0.01"
                value={config.courierMinimumFee || 0}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    courierMinimumFee: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Forfait minimum pour la livraison par coursier, même si le calcul distance × prix/km donne un montant inférieur.
                Exemple : 15.00 pour 15,00€ minimum.
              </p>
            </div>
          </div>

          {/* Options graphisme */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Options graphisme</h3>
            
            <div className="space-y-2">
              <Label htmlFor="vectorizationPrice">
                Prix vectorisation logo (€ HT par logo)
              </Label>
              <Input
                id="vectorizationPrice"
                type="number"
                min="0"
                step="0.01"
                value={config.vectorizationPrice || 0}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    vectorizationPrice: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Prix pour la vectorisation d'un logo par le graphiste.
                Exemple : 25.00 pour 25,00€ par logo.
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

