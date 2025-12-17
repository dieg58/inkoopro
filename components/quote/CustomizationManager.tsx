'use client'

import { useState, useEffect } from 'react'
import { SelectedProduct, TechniqueType, TechniqueOptions, Position, ProductCategory, ServicePricing } from '@/types'
import { ProductMultiSelector } from './ProductMultiSelector'
import { TechniqueSelector } from './TechniqueSelector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { getMinQuantityForTechnique } from '@/lib/service-pricing'

interface Marking {
  id: string
  selectedProductIds: string[]
  technique: TechniqueType | null
  techniqueOptions: TechniqueOptions | null
  position: Position | null
  files: Array<{ id: string; name: string; url: string; size: number; type: string }>
  notes: string
}

interface CustomizationManagerProps {
  selectedProducts: SelectedProduct[]
  onComplete: (markings: Marking[]) => void
  onMarkingsChange?: (markings: Marking[]) => void // Callback pour mettre à jour le récapitulatif en temps réel
}

export function CustomizationManager({ selectedProducts, onComplete, onMarkingsChange }: CustomizationManagerProps) {
  const { toast } = useToast()
  const [markings, setMarkings] = useState<Marking[]>([])
  const [currentMarking, setCurrentMarking] = useState<Marking>({
    id: '',
    selectedProductIds: [],
    technique: null,
    techniqueOptions: null,
    position: null,
    files: [],
    notes: '',
  })
  const [servicePricing, setServicePricing] = useState<ServicePricing[]>([])

  // Charger les prix des services
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const response = await fetch('/api/service-pricing')
        const data = await response.json()
        if (data.success) {
          setServicePricing(data.pricing || [])
        }
      } catch (error) {
        console.error('Erreur lors du chargement des prix des services:', error)
      }
    }
    loadPricing()
  }, [])

  // Calculer la quantité totale pour les produits sélectionnés
  const getTotalQuantityForSelectedProducts = (productIds: string[]): number => {
    return productIds.reduce((total, productId) => {
      const product = selectedProducts.find(p => p.id === productId)
      if (!product) return total
      return total + product.colorQuantities.reduce((sum, cq) => {
        return sum + cq.quantities.reduce((qtySum, qty) => qtySum + qty.quantity, 0)
      }, 0)
    }, 0)
  }

  // Mettre à jour le récapitulatif en temps réel avec le marquage en cours
  useEffect(() => {
    if (!onMarkingsChange) return
    
    // Si le marquage en cours a des données valides, l'inclure dans la liste pour le récapitulatif
    const hasValidCurrentMarking = 
      currentMarking.selectedProductIds.length > 0 &&
      currentMarking.technique &&
      currentMarking.techniqueOptions &&
      currentMarking.position !== null
    
    if (hasValidCurrentMarking) {
      // Créer un marquage temporaire pour le récapitulatif
      const tempMarking: Marking = {
        id: 'temp-current',
        selectedProductIds: currentMarking.selectedProductIds,
        technique: currentMarking.technique,
        techniqueOptions: currentMarking.techniqueOptions,
        position: currentMarking.position,
        files: currentMarking.files,
        notes: currentMarking.notes,
      }
      onMarkingsChange([...markings, tempMarking])
    } else {
      // Sinon, envoyer uniquement les marquages validés
      onMarkingsChange(markings)
    }
  }, [currentMarking, markings, onMarkingsChange])

  // Obtenir la catégorie du produit (prendre la première catégorie des produits sélectionnés)
  const getProductCategory = (): ProductCategory => {
    if (currentMarking.selectedProductIds.length === 0) return 'autre'
    const firstProduct = selectedProducts.find(p => p.id === currentMarking.selectedProductIds[0])
    return firstProduct?.product.category || 'autre'
  }

  const handleAddMarking = () => {
    // Valider que tout est rempli
    if (currentMarking.selectedProductIds.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un produit',
        variant: 'destructive',
      })
      return
    }

    if (!currentMarking.technique || !currentMarking.techniqueOptions) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une technique et configurer ses options',
        variant: 'destructive',
      })
      return
    }

    if (!currentMarking.position) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une position',
        variant: 'destructive',
      })
      return
    }

    // Valider la quantité minimum
    const totalQuantity = getTotalQuantityForSelectedProducts(currentMarking.selectedProductIds)
    const minQuantity = getMinQuantityForTechnique(currentMarking.technique, servicePricing)
    if (totalQuantity < minQuantity) {
      toast({
        title: 'Quantité insuffisante',
        description: `La quantité minimum pour ${currentMarking.technique} est de ${minQuantity} pièce(s). Vous avez ${totalQuantity} pièce(s).`,
        variant: 'destructive',
      })
      return
    }

    // Ajouter le marquage à la liste
    const newMarking: Marking = {
      id: `marking-${Date.now()}`,
      selectedProductIds: [...currentMarking.selectedProductIds],
      technique: currentMarking.technique,
      techniqueOptions: currentMarking.techniqueOptions,
      position: currentMarking.position,
      files: [...currentMarking.files],
      notes: currentMarking.notes,
    }

    const updatedMarkings = [...markings, newMarking]
    setMarkings(updatedMarkings)
    
    // Notifier le parent du changement
    if (onMarkingsChange) {
      onMarkingsChange(updatedMarkings)
    }

    // Réinitialiser pour le prochain marquage
    setCurrentMarking({
      id: '',
      selectedProductIds: [],
      technique: null,
      techniqueOptions: null,
      position: null,
      files: [],
      notes: '',
    })
  }

  const handleRemoveMarking = (markingId: string) => {
    const updatedMarkings = markings.filter(m => m.id !== markingId)
    setMarkings(updatedMarkings)
    
    // Notifier le parent du changement
    if (onMarkingsChange) {
      onMarkingsChange(updatedMarkings)
    }
  }

  const handleCommand = () => {
    if (markings.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez ajouter au moins un marquage',
        variant: 'destructive',
      })
      return
    }

    onComplete(markings)
  }

  const getProductName = (productId: string) => {
    const product = selectedProducts.find(p => p.id === productId)
    return product?.product.name || 'Produit inconnu'
  }

  const getTechniqueName = (technique: TechniqueType) => {
    const names: Record<TechniqueType, string> = {
      serigraphie: 'Sérigraphie',
      broderie: 'Broderie',
      dtf: 'DTF',
    }
    return names[technique] || technique
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>2. Personnalisation des produits</CardTitle>
          <CardDescription>
            Sélectionnez les produits et configurez le marquage. Vous pouvez ajouter plusieurs marquages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sélection des produits */}
          <div className="space-y-2">
            <h3 className="font-semibold">Produits à personnaliser</h3>
            <ProductMultiSelector
              selectedProducts={selectedProducts}
              selectedProductIds={currentMarking.selectedProductIds}
              onSelectionChange={(ids) => setCurrentMarking({ ...currentMarking, selectedProductIds: ids })}
            />
          </div>

          {/* Choix de la technique et du marquage */}
          {currentMarking.selectedProductIds.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Configuration du marquage</h3>
              
              {/* Avertissement quantité minimum */}
              {currentMarking.technique && (() => {
                const totalQuantity = getTotalQuantityForSelectedProducts(currentMarking.selectedProductIds)
                const minQuantity = getMinQuantityForTechnique(currentMarking.technique, servicePricing)
                if (totalQuantity < minQuantity) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ Quantité minimum requise :</strong> La quantité minimum pour {currentMarking.technique} est de {minQuantity} pièce(s). 
                        Vous avez actuellement {totalQuantity} pièce(s).
                      </p>
                    </div>
                  )
                }
                return null
              })()}

              <TechniqueSelector
                selectedTechnique={currentMarking.technique}
                onTechniqueChange={(technique) => {
                  setCurrentMarking({
                    ...currentMarking,
                    technique,
                    techniqueOptions: null,
                    position: null,
                    files: [],
                    notes: '',
                  })
                }}
                options={currentMarking.techniqueOptions}
                onOptionsChange={(options) => {
                  setCurrentMarking({
                    ...currentMarking,
                    techniqueOptions: options,
                  })
                }}
                position={currentMarking.position}
                onPositionChange={(position) => {
                  setCurrentMarking({
                    ...currentMarking,
                    position,
                  })
                }}
                files={currentMarking.files}
                onFilesChange={(files) => {
                  setCurrentMarking({
                    ...currentMarking,
                    files,
                  })
                }}
                notes={currentMarking.notes}
                onNotesChange={(notes) => {
                  setCurrentMarking({
                    ...currentMarking,
                    notes,
                  })
                }}
                productCategory={getProductCategory()}
              />

              {/* Bouton pour ajouter ce marquage */}
              <Button onClick={handleAddMarking} className="w-full" size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter ce marquage
              </Button>
            </div>
          )}

          {/* Liste des marquages ajoutés */}
          {markings.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Marquages ajoutés ({markings.length})</h3>
              <div className="space-y-3">
                {markings.map((marking) => (
                  <Card key={marking.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="font-medium">Produits : </span>
                            <span className="text-sm text-muted-foreground">
                              {marking.selectedProductIds.map(getProductName).join(', ')}
                            </span>
                          </div>
                          {marking.technique && (
                            <div>
                              <span className="font-medium">Technique : </span>
                              <span className="text-sm text-muted-foreground">
                                {getTechniqueName(marking.technique)}
                              </span>
                            </div>
                          )}
                          {marking.position && (
                            <div>
                              <span className="font-medium">Position : </span>
                              <span className="text-sm text-muted-foreground">
                                {marking.position.type === 'custom' ? marking.position.customDescription : marking.position.type}
                              </span>
                            </div>
                          )}
                          {marking.files.length > 0 && (
                            <div>
                              <span className="font-medium">Fichiers : </span>
                              <span className="text-sm text-muted-foreground">
                                {marking.files.length} fichier{marking.files.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {marking.notes && (
                            <div>
                              <span className="font-medium">Notes : </span>
                              <span className="text-sm text-muted-foreground">
                                {marking.notes.substring(0, 50)}{marking.notes.length > 50 ? '...' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMarking(marking.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Bouton Commander */}
          {markings.length > 0 && (
            <div className="pt-4 border-t">
              <Button onClick={handleCommand} className="w-full" size="lg">
                Commander
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

