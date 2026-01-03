'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { SelectedProduct, TechniqueType, TechniqueOptions, Position, ProductCategory, ServicePricing } from '@/types'
import { ProductMultiSelector } from './ProductMultiSelector'
import { TechniqueSelector } from './TechniqueSelector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { getMinQuantityForTechnique } from '@/lib/service-pricing'

interface Marking {
  id: string
  selectedProductIds: string[]
  technique: TechniqueType | null
  techniqueOptions: TechniqueOptions | null
  position: Position | null
  files?: Array<{ id: string; name: string; url: string; size: number; type: string }>
  notes?: string
  vectorization?: boolean // Vectorisation du logo par le graphiste (option payante)
}

interface CustomizationManagerProps {
  selectedProducts: SelectedProduct[]
  onComplete: (markings: Marking[]) => void
  onMarkingsChange?: (markings: Marking[]) => void // Callback pour mettre à jour le récapitulatif en temps réel
  initialMarkings?: Marking[] // Marquages existants à préserver lors du retour en arrière
}

export function CustomizationManager({ selectedProducts, onComplete, onMarkingsChange, initialMarkings = [] }: CustomizationManagerProps) {
  const { toast } = useToast()
  const t = useTranslations('quote')
  const techniqueT = useTranslations('technique')
  const commonT = useTranslations('common')
  const [markings, setMarkings] = useState<Marking[]>(initialMarkings)
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
  const [editingMarkingId, setEditingMarkingId] = useState<string | null>(null) // ID du marquage en cours d'édition

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
          title: commonT('error'),
          description: t('selectAtLeastOneProduct'),
          variant: 'destructive',
        })
      return
    }

    if (!currentMarking.technique || !currentMarking.techniqueOptions) {
        toast({
          title: commonT('error'),
          description: t('selectTechniqueAndOptions'),
          variant: 'destructive',
        })
      return
    }

    if (!currentMarking.position) {
      toast({
        title: commonT('error'),
        description: t('positionRequired'),
        variant: 'destructive',
      })
      return
    }

    // Valider la quantité minimum
    const totalQuantity = getTotalQuantityForSelectedProducts(currentMarking.selectedProductIds)
    const minQuantity = getMinQuantityForTechnique(currentMarking.technique, servicePricing)
    
    // Logs pour déboguer
    console.log('🔍 Validation quantité avant ajout:', {
      technique: currentMarking.technique,
      totalQuantity,
      minQuantity,
      servicePricingLength: servicePricing.length,
      editingMarkingId,
      servicePricingData: servicePricing.find(p => p.technique === currentMarking.technique),
      willBlock: minQuantity > 0 && totalQuantity < minQuantity,
    })
    
    // Valider la quantité minimum - BLOQUER si la quantité est insuffisante
    // minQuantity peut être 0 si pas de minimum requis, sinon c'est la quantité minimum
    if (minQuantity > 0 && totalQuantity < minQuantity) {
      const techniqueName = getTechniqueName(currentMarking.technique)
      console.error('❌ BLOCAGE: Quantité insuffisante pour ajouter le marquage', {
        technique: currentMarking.technique,
        techniqueName,
        totalQuantity,
        minQuantity,
      })
      toast({
        title: t('insufficientQuantity'),
        description: t('minQuantityError', { totalQuantity, minQuantity, technique: techniqueName }),
        variant: 'destructive',
        duration: 8000,
      })
      return // BLOQUER l'ajout du marquage
    }
    
    console.log('✅ Validation quantité OK, ajout du marquage autorisé', {
      technique: currentMarking.technique,
      totalQuantity,
      minQuantity,
    })

    // Créer ou mettre à jour le marquage
    if (editingMarkingId) {
      // Mode édition : remplacer le marquage existant
      const updatedMarkings = markings.map(m => 
        m.id === editingMarkingId 
          ? {
              ...currentMarking,
              id: editingMarkingId, // Conserver l'ID original
              selectedProductIds: currentMarking.selectedProductIds,
              technique: currentMarking.technique,
              techniqueOptions: currentMarking.techniqueOptions,
              position: currentMarking.position,
              files: currentMarking.files,
              notes: currentMarking.notes,
              vectorization: currentMarking.vectorization,
            }
          : m
      )
      setMarkings(updatedMarkings)
      
      // Notifier le parent du changement
      if (onMarkingsChange) {
        onMarkingsChange(updatedMarkings)
      }

      // Sortir du mode édition
      setEditingMarkingId(null)
      
      toast({
        title: t('markingModified') || 'Marquage modifié',
        description: t('markingModifiedDescription') || 'Le marquage a été modifié avec succès',
      })
    } else {
      // Mode création : ajouter un nouveau marquage
    const newMarking: Marking = {
      id: `marking-${Date.now()}`,
      selectedProductIds: [...currentMarking.selectedProductIds],
      technique: currentMarking.technique,
      techniqueOptions: currentMarking.techniqueOptions,
      position: currentMarking.position,
      files: currentMarking.files ? [...currentMarking.files] : [],
      notes: currentMarking.notes,
        vectorization: currentMarking.vectorization,
    }

    const updatedMarkings = [...markings, newMarking]
    setMarkings(updatedMarkings)
    
    // Notifier le parent du changement
    if (onMarkingsChange) {
      onMarkingsChange(updatedMarkings)
      }
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
    
    // Si on supprime le marquage en cours d'édition, sortir du mode édition
    if (editingMarkingId === markingId) {
      setEditingMarkingId(null)
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
    
    // Notifier le parent du changement
    if (onMarkingsChange) {
      onMarkingsChange(updatedMarkings)
    }
  }

  const handleEditMarking = (markingId: string) => {
    const markingToEdit = markings.find(m => m.id === markingId)
    if (!markingToEdit) return

    // Charger les données du marquage dans currentMarking
    setCurrentMarking({
      id: markingToEdit.id,
      selectedProductIds: markingToEdit.selectedProductIds,
      technique: markingToEdit.technique,
      techniqueOptions: markingToEdit.techniqueOptions,
      position: markingToEdit.position,
      files: markingToEdit.files || [],
      notes: markingToEdit.notes || '',
      vectorization: markingToEdit.vectorization || false,
        })
    
    // Activer le mode édition
    setEditingMarkingId(markingId)

    // Scroller vers le formulaire de configuration
    setTimeout(() => {
      const configSection = document.querySelector('[data-config-section]')
      if (configSection) {
        configSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const getProductName = (productId: string) => {
    const product = selectedProducts.find(p => p.id === productId)
    return product?.product.name || t('unknownProduct')
  }

  const getTechniqueName = (technique: TechniqueType) => {
    const names: Record<TechniqueType, string> = {
      serigraphie: techniqueT('serigraphy'),
      broderie: techniqueT('embroidery'),
      dtf: techniqueT('dtf'),
    }
    return names[technique] || technique
  }

  return (
    <div className="space-y-6">
          {/* Sélection des produits */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t('productsToCustomize')}</Label>
            <ProductMultiSelector
              selectedProducts={selectedProducts}
              selectedProductIds={currentMarking.selectedProductIds}
              onSelectionChange={(ids) => setCurrentMarking({ ...currentMarking, selectedProductIds: ids })}
            />
          </div>

          {/* Configuration du marquage */}
          {currentMarking.selectedProductIds.length > 0 && (
        <div className="space-y-4 pt-4 border-t" data-config-section>
              {/* Avertissement quantité minimum */}
              {currentMarking.technique && (() => {
                const totalQuantity = getTotalQuantityForSelectedProducts(currentMarking.selectedProductIds)
                const minQuantity = getMinQuantityForTechnique(currentMarking.technique, servicePricing)
                if (minQuantity > 0 && totalQuantity < minQuantity) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ {t('minQuantityRequired')} :</strong> {t('minQuantityForTechnique', { technique: currentMarking.technique, minQuantity, totalQuantity })}
                      </p>
                    </div>
                  )
                }
                return null
              })()}

              <TechniqueSelector
                selectedTechnique={currentMarking.technique}
                servicePricing={servicePricing}
                onTechniqueChange={(technique) => {
                  // Permettre le changement de technique, mais afficher un avertissement si la quantité est insuffisante
                  if (technique && currentMarking.selectedProductIds.length > 0) {
                    const totalQuantity = getTotalQuantityForSelectedProducts(currentMarking.selectedProductIds)
                    
                    // Récupérer la quantité minimum depuis la base de données (via servicePricing)
                    const minQuantity = getMinQuantityForTechnique(technique, servicePricing)
                    
                    // Logs pour déboguer
                    console.log('🔍 Validation quantité technique:', {
                      technique,
                      totalQuantity,
                      minQuantity,
                      servicePricingLength: servicePricing.length,
                      servicePricingData: servicePricing.find(p => p.technique === technique),
                    })
                    
                    // Afficher un avertissement si la quantité est insuffisante, mais permettre le changement
                    if (minQuantity > 0 && totalQuantity < minQuantity) {
                      const techniqueName = getTechniqueName(technique)
                      toast({
                        title: t('insufficientQuantity'),
                        description: t('techniqueMinQuantityError', { technique: techniqueName, minQuantity, totalQuantity }) + ' Vous pouvez continuer, mais vous devrez ajuster la quantité avant d\'ajouter le marquage.',
                        variant: 'destructive',
                        duration: 8000, // Afficher plus longtemps pour que le message soit lu
                      })
                      // Ne pas empêcher le changement, mais continuer avec l'avertissement
                    }
                  }
                  
                  // Toujours permettre le changement de technique
                  setCurrentMarking({
                    ...currentMarking,
                    technique,
                    techniqueOptions: null,
                    position: null,
                    files: [],
                    notes: '',
                    vectorization: false,
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
                files={currentMarking.files || []}
                onFilesChange={(files) => {
                  setCurrentMarking({
                    ...currentMarking,
                    files,
                  })
                }}
                notes={currentMarking.notes || ''}
                onNotesChange={(notes) => {
                  setCurrentMarking({
                    ...currentMarking,
                    notes,
                  })
                }}
                productCategory={getProductCategory()}
                vectorization={currentMarking.vectorization || false}
                onVectorizationChange={(vectorization) => {
                  setCurrentMarking({
                    ...currentMarking,
                    vectorization,
                  })
                }}
              />

          {/* Bouton pour ajouter ou modifier ce marquage */}
              <Button 
                onClick={handleAddMarking} 
                className="w-full" 
                size="lg"
                disabled={!currentMarking.technique || !currentMarking.techniqueOptions || !currentMarking.position}
              >
            {editingMarkingId ? (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                {t('modifyMarking') || 'Modifier le marquage'}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t('addMarking')}
              </>
            )}
              </Button>
            </div>
          )}

      {/* Liste des marquages ajoutés */}
      {markings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('addedMarkings', { count: markings.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {markings.map((marking, index) => (
                <div key={marking.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 text-sm">
                    <span className="font-medium">#{index + 1} </span>
                    <span>{marking.selectedProductIds.map(getProductName).join(', ')} - </span>
                    <span className="text-muted-foreground">
                      {marking.technique ? getTechniqueName(marking.technique) : t('notConfigured')}
                    </span>
                    {editingMarkingId === marking.id && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">(En cours de modification)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditMarking(marking.id)}
                      disabled={editingMarkingId !== null && editingMarkingId !== marking.id}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMarking(marking.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}

