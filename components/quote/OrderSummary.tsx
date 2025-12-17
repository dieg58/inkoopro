'use client'

import { useState, useEffect } from 'react'
import { SelectedProduct, ProductSize, ServicePricing, QuantityRange, Delay } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { delayOptions } from '@/lib/data'
import { calculateExpressSurcharge } from '@/lib/delivery-dates'
import { Loader2 } from 'lucide-react'

interface Marking {
  id: string
  selectedProductIds: string[]
  technique: string | null
  techniqueOptions: any | null
  position: { type: string; customDescription?: string } | null
  files?: Array<{ id: string; name: string; url: string; size: number; type: string }>
  notes?: string
}

interface OrderSummaryProps {
  selectedProducts: SelectedProduct[]
  markings: Marking[]
  delay?: Delay // Délai pour calculer le supplément express
  showValidationButton?: boolean // Afficher le bouton de validation
  onValidate?: () => void // Callback pour la validation
  isSubmitting?: boolean // État de soumission
  canValidate?: boolean // Peut valider (vérifications passées)
}

export function OrderSummary({ 
  selectedProducts, 
  markings, 
  delay,
  showValidationButton = false,
  onValidate,
  isSubmitting = false,
  canValidate = false,
}: OrderSummaryProps) {
  const [servicePricing, setServicePricing] = useState<ServicePricing[]>([])
  const [pricingConfig, setPricingConfig] = useState<{ textileDiscountPercentage: number }>({
    textileDiscountPercentage: 30,
  })
  const [cgvAccepted, setCgvAccepted] = useState(false)

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

  // Charger la configuration des prix
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/pricing-config')
        const data = await response.json()
        if (data.success && data.config) {
          setPricingConfig({
            textileDiscountPercentage: data.config.textileDiscountPercentage || 30,
          })
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration des prix:', error)
      }
    }
    loadConfig()
  }, [])

  const getProductName = (productId: string) => {
    const product = selectedProducts.find(p => p.id === productId)
    return product?.product.name || 'Produit inconnu'
  }

  const getProductTotalQuantity = (productId: string) => {
    const product = selectedProducts.find(p => p.id === productId)
    if (!product) return 0
    return product.colorQuantities.reduce((total, cq) => {
      return total + cq.quantities.reduce((sum, q) => sum + q.quantity, 0)
    }, 0)
  }

  const getProductColors = (productId: string) => {
    const product = selectedProducts.find(p => p.id === productId)
    if (!product) return []
    return product.colorQuantities
      .filter(cq => cq.quantities.some(q => q.quantity > 0))
      .map(cq => ({
        color: cq.color,
        quantities: cq.quantities.filter(q => q.quantity > 0),
      }))
  }

  // Obtenir un résumé des quantités par taille pour un produit
  const getSizeSummary = (productId: string): string => {
    const product = selectedProducts.find(p => p.id === productId)
    if (!product) return ''

    // Agréger les quantités par taille (toutes couleurs confondues)
    const sizeQuantities: Record<string, number> = {}
    
    product.colorQuantities.forEach(cq => {
      cq.quantities.forEach(qty => {
        if (qty.quantity > 0) {
          const size = qty.size
          sizeQuantities[size] = (sizeQuantities[size] || 0) + qty.quantity
        }
      })
    })

    // Trier les tailles dans un ordre logique
    const sizeOrder: Record<string, number> = {
      'XS': 1,
      'S': 2,
      'M': 3,
      'L': 4,
      'XL': 5,
      '2XL': 6,
      '3XL': 7,
      '4XL': 8,
      'Taille unique': 9,
    }

    const sortedSizes = Object.keys(sizeQuantities).sort((a, b) => {
      const orderA = sizeOrder[a] || 999
      const orderB = sizeOrder[b] || 999
      return orderA - orderB
    })

    // Formater le résumé : "2/L 4/XL 17/2XL"
    return sortedSizes
      .map(size => `${sizeQuantities[size]}/${size}`)
      .join(' ')
  }

  const getTechniqueName = (technique: string | null) => {
    if (!technique) return 'Non défini'
    const names: Record<string, string> = {
      serigraphie: 'Sérigraphie',
      broderie: 'Broderie',
      dtf: 'DTF',
    }
    return names[technique] || technique
  }

  const formatTechniqueOptions = (technique: string, options: any) => {
    if (!options) return ''
    if (technique === 'serigraphie') {
      const textileType = options.textileType === 'clair' ? 'textile clair' : 'textile foncé'
      return `${textileType}, ${options.nombreCouleurs} couleur(s), ${options.dimension || 'N/A'}, ${options.nombreEmplacements} emplacement(s)`
    } else if (technique === 'broderie') {
      return `${options.nombrePoints?.toLocaleString() || 0} points, ${options.nombreEmplacements} emplacement(s)`
    } else if (technique === 'dtf') {
      return `${options.dimension || 'N/A'}, ${options.nombreEmplacements} emplacement(s)`
    }
    return ''
  }

  const getTotalProducts = () => {
    const allProductIds = new Set<string>()
    markings.forEach(marking => {
      marking.selectedProductIds.forEach(id => allProductIds.add(id))
    })
    return allProductIds.size
  }

  const getTotalQuantity = () => {
    const allProductIds = new Set<string>()
    markings.forEach(marking => {
      marking.selectedProductIds.forEach(id => allProductIds.add(id))
    })
    return Array.from(allProductIds).reduce((total, productId) => {
      return total + getProductTotalQuantity(productId)
    }, 0)
  }

  // Calculer le prix d'un produit (avec réduction textile si applicable)
  const getProductPrice = (productId: string, color: string, size: ProductSize): number => {
    const product = selectedProducts.find(p => p.id === productId)
    if (!product) return 0
    
    // Si le client fournit le produit, le prix est 0
    if (product.clientProvided) {
      return 0
    }
    
    let basePrice: number | null = null
    
    // Si variantPrices existe, essayer de trouver le prix spécifique
    if (product.product.variantPrices) {
      const keys = [
        `${color}-${size}`,
        `${color} ${size}`,
        `${size}-${color}`,
        `${size} ${color}`,
        color,
        size,
      ]
      
      for (const key of keys) {
        if (product.product.variantPrices[key] !== undefined) {
          basePrice = product.product.variantPrices[key]
          break
        }
      }
    }
    
    // Si aucun prix spécifique trouvé, utiliser le prix de base
    if (basePrice === null) {
      basePrice = product.product.basePrice || 0
    }
    
    // Appliquer la réduction sur le textile si configurée
    if (basePrice > 0 && pricingConfig.textileDiscountPercentage > 0) {
      const discount = (basePrice * pricingConfig.textileDiscountPercentage) / 100
      return basePrice - discount
    }
    
    return basePrice
  }

  // Calculer le total pour un produit
  const getProductTotal = (productId: string): number => {
    const product = selectedProducts.find(p => p.id === productId)
    if (!product) return 0
    
    let total = 0
    product.colorQuantities.forEach(cq => {
      cq.quantities.forEach(qty => {
        if (qty.quantity > 0) {
          const price = getProductPrice(productId, cq.color, qty.size)
          total += price * qty.quantity
        }
      })
    })
    return total
  }

  // Type pour les détails de prix d'un service
  type ServicePriceDetails = {
    unitPrice: number
    quantity: number
    fixedFees: number
    emplacements: number
    expressSurcharge: number
    total: number
  }

  // Calculer le détail du prix d'un service (unitaire + frais fixes)
  const getServicePriceDetails = (marking: Marking): ServicePriceDetails | null => {
    if (!marking.technique || !marking.techniqueOptions || servicePricing.length === 0) return null

    // Calculer la quantité totale pour ce marquage
    const totalQuantity = marking.selectedProductIds.reduce((sum, productId) => {
      return sum + getProductTotalQuantity(productId)
    }, 0)

    if (totalQuantity === 0) return null

    const pricing = servicePricing.find(p => p.technique === marking.technique)
    if (!pricing) return null

    if (marking.technique === 'serigraphie') {
      const serigraphieOptions = marking.techniqueOptions as any
      const colorCount = serigraphieOptions.nombreCouleurs || 1
      const emplacements = 1 // Une seule position par marquage maintenant
      const serigraphiePricing = pricing as any
      
      // Calculer le prix unitaire (sans frais fixes)
      const quantityRange = findQuantityRange(totalQuantity, serigraphiePricing.quantityRanges)
      if (!quantityRange) return null
      
      const key = `${quantityRange.label}-${colorCount}`
      const unitPrice = serigraphiePricing.prices[key] || 0
      
      // Frais fixes : 25€ par couleur
      const fixedFees = (serigraphiePricing.fixedFeePerColor || 0) * colorCount
      
      // Calculer le total avant supplément express
      const baseTotal = ((unitPrice * totalQuantity) + fixedFees) * emplacements
      
      // Appliquer le supplément express si applicable (10% par jour plus court)
      let expressSurcharge = 0
      if (delay) {
        const standardDays = 10 // 10 jours ouvrables par défaut
        let daysToCompare = delay.workingDays
        
        if (delay.isExpress && delay.expressDays !== undefined) {
          daysToCompare = delay.expressDays
        }
        
        if (daysToCompare < standardDays) {
          const surchargePercent = calculateExpressSurcharge(standardDays, daysToCompare)
          expressSurcharge = (baseTotal * surchargePercent) / 100
        }
      }
      
      const total = baseTotal + expressSurcharge
      
      return {
        unitPrice,
        quantity: totalQuantity,
        fixedFees,
        emplacements,
        expressSurcharge,
        total,
      }
    } else if (marking.technique === 'broderie') {
      const broderieOptions = marking.techniqueOptions as any
      const pointCount = broderieOptions.nombrePoints || 0
      const emplacements = 1 // Une seule position par marquage maintenant
      const broderiePricing = pricing as any
      
      // Calculer le prix unitaire (sans frais fixes)
      const quantityRange = findQuantityRange(totalQuantity, broderiePricing.quantityRanges)
      if (!quantityRange) return null
      
      // Trouver la fourchette de points
      const pointRange = broderiePricing.pointRanges.find((range: any) => 
        pointCount >= range.min && (range.max === null || pointCount <= range.max)
      )
      if (!pointRange) return null
      
      const key = `${quantityRange.label}-${pointRange.label}`
      const unitPrice = broderiePricing.prices[key] || 0
      
      // Frais fixes de digitalisation
      const fixedFees = pointCount <= (broderiePricing.smallDigitizationThreshold || 10000)
        ? (broderiePricing.fixedFeeSmallDigitization || 0) // 40€ pour petite digitalisation
        : (broderiePricing.fixedFeeLargeDigitization || 0) // 60€ pour grande digitalisation
      
      // Calculer le total avant supplément express
      const baseTotal = ((unitPrice * totalQuantity) + fixedFees) * emplacements
      
      // Appliquer le supplément express si applicable (10% par jour plus court)
      let expressSurcharge = 0
      if (delay) {
        const standardDays = 10 // 10 jours ouvrables par défaut
        let daysToCompare = delay.workingDays
        
        if (delay.isExpress && delay.expressDays !== undefined) {
          daysToCompare = delay.expressDays
        }
        
        if (daysToCompare < standardDays) {
          const surchargePercent = calculateExpressSurcharge(standardDays, daysToCompare)
          expressSurcharge = (baseTotal * surchargePercent) / 100
        }
      }
      
      const total = baseTotal + expressSurcharge
      
      return {
        unitPrice,
        quantity: totalQuantity,
        fixedFees,
        emplacements,
        expressSurcharge,
        total,
      }
    } else if (marking.technique === 'dtf') {
      const dtfOptions = marking.techniqueOptions as any
      const dimension = dtfOptions.dimension || '10x10 cm'
      const emplacements = 1 // Une seule position par marquage maintenant
      const dtfPricing = pricing as any
      
      // Calculer le prix unitaire
      const quantityRange = findQuantityRange(totalQuantity, dtfPricing.quantityRanges)
      if (!quantityRange) return null
      
      const key = `${quantityRange.label}-${dimension}`
      const unitPrice = dtfPricing.prices[key] || 0
      
      // Pas de frais fixes pour DTF
      const fixedFees = 0
      
      // Calculer le total avant supplément express
      const baseTotal = (unitPrice * totalQuantity) * emplacements
      
      // Appliquer le supplément express si applicable (10% par jour plus court)
      let expressSurcharge = 0
      if (delay) {
        const standardDays = 10 // 10 jours ouvrables par défaut
        let daysToCompare = delay.workingDays
        
        if (delay.isExpress && delay.expressDays !== undefined) {
          daysToCompare = delay.expressDays
        }
        
        if (daysToCompare < standardDays) {
          const surchargePercent = calculateExpressSurcharge(standardDays, daysToCompare)
          expressSurcharge = (baseTotal * surchargePercent) / 100
        }
      }
      
      const total = baseTotal + expressSurcharge
      
      return {
        unitPrice,
        quantity: totalQuantity,
        fixedFees,
        emplacements,
        expressSurcharge,
        total,
      }
    }

    return null
  }

  // Fonction helper pour trouver la fourchette de quantité
  const findQuantityRange = (quantity: number, ranges: QuantityRange[]): QuantityRange | null => {
    for (const range of ranges) {
      if (quantity >= range.min && (range.max === null || quantity <= range.max)) {
        return range
      }
    }
    return null
  }

  // Calculer le prix total d'un service (pour compatibilité)
  const getServicePrice = (marking: Marking): number => {
    const details = getServicePriceDetails(marking)
    return details?.total || 0
  }

  // Calculer le total des services
  const getServicesTotal = (): number => {
    return markings.reduce((total, marking) => {
      return total + getServicePrice(marking)
    }, 0)
  }

  // Calculer le total général
  const getGrandTotal = (): number => {
    const productsTotal = Array.from(new Set(markings.flatMap(m => m.selectedProductIds))).reduce((total, productId) => {
      return total + getProductTotal(productId)
    }, 0)
    const servicesTotal = getServicesTotal()
    return productsTotal + servicesTotal
  }

  if (markings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Votre commande</CardTitle>
          <CardDescription>Votre commande est vide</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Votre commande</CardTitle>
        <CardDescription>
          {markings.length} marquage{markings.length > 1 ? 's' : ''} • {getTotalProducts()} produit{getTotalProducts() > 1 ? 's' : ''} • {getTotalQuantity()} pièce{getTotalQuantity() > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Liste des produits avec prix - Style ticket de caisse */}
        <div className="space-y-2 border-b pb-3">
          {Array.from(new Set(markings.flatMap(m => m.selectedProductIds))).map(productId => {
            const product = selectedProducts.find(p => p.id === productId)
            if (!product) return null
            
            const productTotal = getProductTotal(productId)
            const quantity = getProductTotalQuantity(productId)
            const sizeSummary = getSizeSummary(productId)
            
            return (
              <div key={productId} className="flex justify-between items-start text-sm">
                <div className="flex-1">
                  <div className="font-medium">
                    {product.product.name}
                    {product.clientProvided && (
                      <span className="ml-1 text-xs text-blue-600">(Fourni)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>
                      {quantity} × {productTotal > 0 ? (productTotal / quantity).toFixed(2) : '0.00'} € HT
                    </div>
                    {sizeSummary && (
                      <div className="font-medium text-foreground">
                        {sizeSummary}
                      </div>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-right min-w-[60px]">
                  {productTotal.toFixed(2)} € HT
                </div>
              </div>
            )
          })}
        </div>

        {/* Liste des services avec prix */}
        {markings.length > 0 && servicePricing.length > 0 && (
          <div className="space-y-2 border-b pb-3">
            {markings.map((marking, index) => {
              if (!marking.technique || !marking.techniqueOptions) return null
              
              const priceDetails = getServicePriceDetails(marking)
              if (!priceDetails || priceDetails.total === 0) return null
              
              const techniqueName = getTechniqueName(marking.technique)
              
              // Détails du service pour l'affichage
              let serviceDetails = ''
              if (marking.technique === 'serigraphie') {
                const opts = marking.techniqueOptions as any
                serviceDetails = `${opts.nombreCouleurs || 1} couleur${(opts.nombreCouleurs || 1) > 1 ? 's' : ''}, 1 emplacement`
              } else if (marking.technique === 'broderie') {
                const opts = marking.techniqueOptions as any
                serviceDetails = `${(opts.nombrePoints || 0).toLocaleString()} points, 1 emplacement`
              } else if (marking.technique === 'dtf') {
                const opts = marking.techniqueOptions as any
                serviceDetails = `${opts.dimension || 'N/A'}, 1 emplacement`
              }
              
              // Calculer le prix unitaire × quantité (sans frais fixes)
              const unitPriceTotal = priceDetails.unitPrice * priceDetails.quantity
              // Prix par emplacement (unitaire + frais fixes)
              const pricePerEmplacement = unitPriceTotal + priceDetails.fixedFees
              // Total avant supplément express
              const baseTotal = pricePerEmplacement * priceDetails.emplacements
              
              return (
                <div key={marking.id || index} className="space-y-1">
                  <div className="flex justify-between items-start text-sm">
                    <div className="flex-1">
                      <div className="font-medium">
                        {techniqueName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {priceDetails.quantity} pièce{priceDetails.quantity > 1 ? 's' : ''} • {serviceDetails}
                      </div>
                    </div>
                    <div className="font-semibold text-right min-w-[60px]">
                      {priceDetails.total.toFixed(2)} € HT
                    </div>
                  </div>
                  {/* Détail du prix */}
                  <div className="text-xs text-muted-foreground pl-4 space-y-0.5">
                    <div className="flex justify-between">
                      <span>{priceDetails.quantity} × {priceDetails.unitPrice.toFixed(2)} € HT</span>
                      <span>{unitPriceTotal.toFixed(2)} € HT</span>
                    </div>
                    {priceDetails.fixedFees > 0 && (
                      <div className="flex justify-between">
                        <span>Frais fixes</span>
                        <span>{priceDetails.fixedFees.toFixed(2)} € HT</span>
                      </div>
                    )}
                    {priceDetails.expressSurcharge && priceDetails.expressSurcharge > 0 && (
                      <div className="flex justify-between text-orange-600 font-medium">
                        <span>Supplément express</span>
                        <span>+{priceDetails.expressSurcharge.toFixed(2)} € HT</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Total */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center font-bold text-lg">
            <span>TOTAL HT</span>
            <span>{getGrandTotal().toFixed(2)} € HT</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Tous les prix sont hors taxes
          </div>
          {pricingConfig.textileDiscountPercentage > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Réduction textile: {pricingConfig.textileDiscountPercentage}%
            </div>
          )}
        </div>

        {/* Bouton de validation et CGV */}
        {showValidationButton && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="cgv"
                checked={cgvAccepted}
                onCheckedChange={(checked) => setCgvAccepted(checked === true)}
              />
              <Label
                htmlFor="cgv"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                J'accepte les conditions générales de vente
              </Label>
            </div>
            <Button
              onClick={onValidate}
              disabled={isSubmitting || !canValidate || !cgvAccepted}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Valider et envoyer le devis'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

