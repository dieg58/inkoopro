'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SelectedProduct, ProductSize, ServicePricing, QuantityRange, Delay, Delivery } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { delayOptions } from '@/lib/data'
import { calculateExpressSurcharge } from '@/lib/delivery-dates'
import { calculateCartons } from '@/lib/shipping'
import { Loader2, AlertCircle } from 'lucide-react'

interface Marking {
  id: string
  selectedProductIds: string[]
  technique: string | null
  techniqueOptions: any | null
  position: { type: string; customDescription?: string } | null
  files?: Array<{ id: string; name: string; url: string; size: number; type: string }>
  notes?: string
  vectorization?: boolean // Vectorisation du logo par le graphiste (option payante)
}

interface OrderSummaryProps {
  selectedProducts: SelectedProduct[]
  markings: Marking[]
  delay?: Delay // Délai pour calculer le supplément express
  delivery?: Delivery // Informations de livraison pour calculer les frais de port
  showValidationButton?: boolean // Afficher le bouton de validation
  onValidate?: () => void // Callback pour la validation
  isSubmitting?: boolean // État de soumission
  canValidate?: boolean // Peut valider (vérifications passées)
}

export function OrderSummary({ 
  selectedProducts, 
  markings, 
  delay,
  delivery,
  showValidationButton = false,
  onValidate,
  isSubmitting = false,
  canValidate = false,
}: OrderSummaryProps) {
  const t = useTranslations('quote')
  const summaryT = useTranslations('summary')
  const commonT = useTranslations('common')
  const techniqueT = useTranslations('technique')
  const [servicePricing, setServicePricing] = useState<ServicePricing[]>([])
  const [pricingConfig, setPricingConfig] = useState<{
    textileDiscountPercentage: number
    individualPackagingPrice: number
    newCartonPrice: number
    vectorizationPrice: number
  }>({
    textileDiscountPercentage: 30,
    individualPackagingPrice: 0,
    newCartonPrice: 0,
    vectorizationPrice: 0,
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
            individualPackagingPrice: data.config.individualPackagingPrice || 0,
            newCartonPrice: data.config.newCartonPrice || 0,
            vectorizationPrice: data.config.vectorizationPrice || 0,
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
    return product?.product.name || t('unknownProduct')
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

  // Mémoïser les calculs de totaux
  const totalProducts = useMemo(() => {
    const allProductIds = new Set<string>()
    markings.forEach(marking => {
      marking.selectedProductIds.forEach(id => allProductIds.add(id))
    })
    return allProductIds.size
  }, [markings])

  const getTotalProducts = useCallback(() => totalProducts, [totalProducts])

  const totalQuantity = useMemo(() => {
    const allProductIds = new Set<string>()
    markings.forEach(marking => {
      marking.selectedProductIds.forEach(id => allProductIds.add(id))
    })
    return Array.from(allProductIds).reduce((total, productId) => {
      return total + getProductTotalQuantity(productId)
    }, 0)
  }, [markings, selectedProducts])
  
  const getTotalQuantity = useCallback(() => totalQuantity, [totalQuantity])

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
    error?: {
      message: string
      minQuantity: number
    }
  }

  // Fonction helper pour trouver la quantité minimum disponible pour un nombre de couleurs donné
  const findMinQuantityForColorCount = (
    colorCount: number,
    textileType: 'clair' | 'fonce',
    serigraphiePricing: any
  ): number | null => {
    const prices = textileType === 'clair' 
      ? (serigraphiePricing.pricesClair || serigraphiePricing.prices) 
      : (serigraphiePricing.pricesFonce || serigraphiePricing.prices)
    
    // Parcourir les fourchettes de quantité par ordre croissant
    for (const range of serigraphiePricing.quantityRanges) {
      const key = `${range.label}-${colorCount}`
      const price = prices[key]
      if (price !== undefined && price !== null && price > 0) {
        return range.min
      }
    }
    return null
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
      const textileType = serigraphieOptions.textileType || 'clair' // Par défaut : clair
      const selectedOptions = serigraphieOptions.selectedOptions || [] // Options sélectionnées
      const emplacements = 1 // Une seule position par marquage maintenant
      const serigraphiePricing = pricing as any
      
      // Calculer le prix unitaire (sans frais fixes)
      const quantityRange = findQuantityRange(totalQuantity, serigraphiePricing.quantityRanges)
      if (!quantityRange) return null
      
      const key = `${quantityRange.label}-${colorCount}`
      // Utiliser le bon tableau de prix selon le type de textile
      const prices = textileType === 'clair' 
        ? (serigraphiePricing.pricesClair || serigraphiePricing.prices) 
        : (serigraphiePricing.pricesFonce || serigraphiePricing.prices)
      const unitPrice = prices[key] || 0
      
      // Vérifier si le prix est disponible
      if (unitPrice === 0 || prices[key] === undefined || prices[key] === null) {
        const minQuantity = findMinQuantityForColorCount(colorCount, textileType, serigraphiePricing)
        if (minQuantity !== null) {
          const textileLabel = textileType === 'fonce' ? summaryT('darkTextile') : summaryT('lightTextile')
          return {
            unitPrice: 0,
            quantity: totalQuantity,
            fixedFees: 0,
            emplacements: 1,
            expressSurcharge: 0,
            total: 0,
            error: {
              message: `Quantité insuffisante pour ${colorCount} couleur${colorCount > 1 ? 's' : ''} sur ${textileLabel}. Quantité minimum: ${minQuantity} pièces.`,
              minQuantity,
            },
          }
        }
      }
      
      // Frais fixes : 25€ par couleur
      const fixedFees = (serigraphiePricing.fixedFeePerColor || 0) * colorCount
      
      // Calculer le total avant options et supplément express
      const basePrice = (unitPrice * totalQuantity) + fixedFees
      
      // Appliquer les pourcentages supplémentaires des options sélectionnées
      let optionsSurcharge = 0
      if (selectedOptions.length > 0 && serigraphiePricing.options) {
        const totalSurchargePercent = selectedOptions.reduce((total: number, optionId: string) => {
          const option = serigraphiePricing.options.find((opt: any) => opt.id === optionId)
          return total + (option?.surchargePercentage || 0)
        }, 0)
        optionsSurcharge = (basePrice * totalSurchargePercent) / 100
      }
      
      // Calculer le total avant supplément express
      const baseTotal = (basePrice + optionsSurcharge) * emplacements
      
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
        fixedFees: fixedFees + (optionsSurcharge / emplacements), // Inclure le surcoût des options dans les frais fixes pour l'affichage
        emplacements,
        expressSurcharge,
        total,
      }
    } else if (marking.technique === 'broderie') {
      const broderieOptions = marking.techniqueOptions as any
      const pointCount = broderieOptions.nombrePoints || 0
      const embroiderySize = broderieOptions.embroiderySize || 'petite' // Par défaut : petite
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
      // Utiliser le bon tableau de prix selon la taille
      const prices = embroiderySize === 'petite' 
        ? (broderiePricing.pricesPetite || broderiePricing.prices) 
        : (broderiePricing.pricesGrande || broderiePricing.prices)
      const unitPrice = prices[key] || 0
      
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
    // Ne pas compter les services avec erreur (prix non disponible)
    if (details?.error) return 0
    return details?.total || 0
  }

  // Calculer le total des services (mémoïsé)
  // Important: selectedProducts doit être dans les dépendances car getServicePriceDetails
  // utilise getProductTotalQuantity qui lit depuis selectedProducts
  const servicesTotal = useMemo(() => {
    return markings.reduce((total, marking) => {
      return total + getServicePrice(marking)
    }, 0)
  }, [markings, servicePricing, selectedProducts, delay])
  
  const getServicesTotal = useCallback((): number => {
    return servicesTotal
  }, [servicesTotal])

  // Calculer les frais de port
  const [shippingCost, setShippingCost] = useState<number>(0)
  const [shippingCostLoading, setShippingCostLoading] = useState(false)

  useEffect(() => {
    const calculateCost = async () => {
      // Les frais de port ne s'appliquent que pour DPD et Coursier
      if (delivery?.type === 'pickup' || delivery?.type === 'client_carrier') {
        setShippingCost(0)
        return
      }
      
      setShippingCostLoading(true)
      try {
        // Charger la config de prix si nécessaire
        let config = pricingConfig
        if (!config || (!(config as any).courierPricePerKm && delivery?.type === 'courier')) {
          const response = await fetch('/api/pricing-config')
          const data = await response.json()
          if (data.success && data.config) {
            config = {
              courierPricePerKm: data.config.courierPricePerKm,
              courierMinimumFee: data.config.courierMinimumFee,
            } as any
          }
        }
        
        const { calculateShippingCost } = await import('@/lib/shipping')
        const cost = await calculateShippingCost(selectedProducts, delivery, config as any)
        setShippingCost(cost)
      } catch (error) {
        console.error('Erreur calcul frais de port:', error)
        setShippingCost(0)
      } finally {
        setShippingCostLoading(false)
      }
    }
    
    calculateCost()
  }, [delivery, selectedProducts, pricingConfig])

  const getShippingCost = useCallback((): number => {
    return shippingCost
  }, [shippingCost])

  // Calculer le coût de l'emballage individuel
  const getIndividualPackagingCost = (): number => {
    if (!delivery?.individualPackaging || pricingConfig.individualPackagingPrice === 0) {
      return 0
    }
    // Calculer le nombre total de pièces
    const totalQuantity = getTotalQuantity()
    return totalQuantity * pricingConfig.individualPackagingPrice
  }

  // Calculer le coût des cartons neufs
  const getNewCartonCost = (): number => {
    if (!delivery?.newCarton || pricingConfig.newCartonPrice === 0) {
      return 0
    }
    // Calculer le nombre de cartons
    const cartonsCount = getCartonsCount()
    return cartonsCount * pricingConfig.newCartonPrice
  }

  // Calculer le nombre de cartons
  const getCartonsCount = (): number => {
    return calculateCartons(selectedProducts)
  }

  // Calculer le coût de la vectorisation des logos
  const getVectorizationCost = (): number => {
    if (pricingConfig.vectorizationPrice === 0) {
      return 0
    }
    // Compter le nombre de marquages avec vectorisation activée
    const vectorizationCount = markings.filter(m => m.vectorization && m.files && m.files.length > 0).length
    return vectorizationCount * pricingConfig.vectorizationPrice
  }

  // Calculer le total du supplément express
  const getTotalExpressSurcharge = (): number => {
    if (!delay) return 0
    return markings.reduce((total, marking) => {
      const priceDetails = getServicePriceDetails(marking)
      return total + (priceDetails?.expressSurcharge || 0)
    }, 0)
  }

  // Calculer le total général
  const getGrandTotal = (): number => {
    const productsTotal = Array.from(new Set(markings.flatMap(m => m.selectedProductIds))).reduce((total, productId) => {
      return total + getProductTotal(productId)
    }, 0)
    const servicesTotal = getServicesTotal()
    const shippingCost = getShippingCost()
    const packagingCost = getIndividualPackagingCost()
    const cartonCost = getNewCartonCost()
    const vectorizationCost = getVectorizationCost()
    // Le supplément express est déjà inclus dans servicesTotal, donc on ne l'ajoute pas deux fois
    return productsTotal + servicesTotal + shippingCost + packagingCost + cartonCost + vectorizationCost
  }

  if (markings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('yourOrder')}</CardTitle>
          <CardDescription>{t('emptyOrder')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('yourOrder')}</CardTitle>
        <CardDescription>
          {markings.length} {t('markings')} • {getTotalProducts()} {getTotalProducts() > 1 ? t('products') : t('product')} • {getTotalQuantity()} {t('pieces')}
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
              if (!priceDetails) return null
              
              // Afficher l'erreur si le prix n'est pas disponible
              if (priceDetails.error) {
                return (
                  <div key={marking.id || index} className="space-y-1">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {priceDetails.error.message}
                      </AlertDescription>
                    </Alert>
                  </div>
                )
              }
              
              if (priceDetails.total === 0) return null
              
              const techniqueName = getTechniqueName(marking.technique)
              
              // Détails du service pour l'affichage
              let serviceDetails = ''
              if (marking.technique === 'serigraphie') {
                const opts = marking.techniqueOptions as any
                const textileLabel = opts.textileType === 'fonce' ? summaryT('darkTextile') : summaryT('lightTextile')
                const selectedOptions = opts.selectedOptions || []
                const serigraphiePricing = servicePricing.find((p: any) => p.technique === 'serigraphie') as any
                const optionsLabels = selectedOptions.map((optId: string) => {
                  const option = serigraphiePricing?.options?.find((opt: any) => opt.id === optId)
                  return option ? option.name : optId
                })
                const optionsText = optionsLabels.length > 0 ? `, ${optionsLabels.join(', ')}` : ''
                serviceDetails = `${textileLabel}, ${opts.nombreCouleurs || 1} couleur${(opts.nombreCouleurs || 1) > 1 ? 's' : ''}${optionsText}, 1 emplacement`
              } else if (marking.technique === 'broderie') {
                const opts = marking.techniqueOptions as any
                const sizeLabel = opts.embroiderySize === 'grande' ? techniqueT('large') : techniqueT('small')
                serviceDetails = `${sizeLabel}, ${(opts.nombrePoints || 0).toLocaleString()} points, 1 emplacement`
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
                        {priceDetails.quantity} {t('pieces')} • {serviceDetails}
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
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Frais de port */}
        {(delivery?.type === 'dpd' || delivery?.type === 'courier') && selectedProducts.length > 0 && (
          <div className="space-y-2 border-b pb-3">
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="font-medium">{summaryT('shipping')}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({getCartonsCount()} {summaryT('cartonCount')}{getCartonsCount() > 1 ? 's' : ''} × 13,65 €)
                </span>
              </div>
              <div className="font-semibold">
                {getShippingCost().toFixed(2)} € HT
              </div>
            </div>
          </div>
        )}

        {/* Options de livraison */}
        {(getIndividualPackagingCost() > 0 || getNewCartonCost() > 0) && (
          <div className="space-y-2 border-b pb-3">
            {getIndividualPackagingCost() > 0 && (
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{summaryT('packaging')}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({getTotalQuantity()} {t('pieces')} × {pricingConfig.individualPackagingPrice.toFixed(2)} €)
                  </span>
                </div>
                <div className="font-semibold">
                  {getIndividualPackagingCost().toFixed(2)} € HT
                </div>
              </div>
            )}
            {getNewCartonCost() > 0 && (
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{summaryT('carton')}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({getCartonsCount()} {summaryT('carton')}{getCartonsCount() > 1 ? 's' : ''} × {pricingConfig.newCartonPrice.toFixed(2)} €)
                  </span>
                </div>
                <div className="font-semibold">
                  {getNewCartonCost().toFixed(2)} € HT
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vectorisation des logos */}
        {getVectorizationCost() > 0 && (
          <div className="space-y-2 border-b pb-3">
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="font-medium">{summaryT('vectorization')}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({markings.filter(m => m.vectorization && m.files && m.files.length > 0).length} {summaryT('logo')}{markings.filter(m => m.vectorization && m.files && m.files.length > 0).length > 1 ? 's' : ''} × {pricingConfig.vectorizationPrice.toFixed(2)} €)
                </span>
              </div>
              <div className="font-semibold">
                {getVectorizationCost().toFixed(2)} € HT
              </div>
            </div>
          </div>
        )}

        {/* Supplément express total */}
        {getTotalExpressSurcharge() > 0 && (
          <div className="space-y-2 border-b pb-3">
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="font-medium text-orange-600">Supplément express</span>
              </div>
              <div className="font-semibold text-orange-600">
                +{getTotalExpressSurcharge().toFixed(2)} € HT
              </div>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center font-bold text-lg">
            <span>{summaryT('totalHT')}</span>
            <span>{getGrandTotal().toFixed(2)} € HT</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summaryT('pricesExcludeTax')}
          </div>
          {pricingConfig.textileDiscountPercentage > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {summaryT('textileDiscount', { percentage: pricingConfig.textileDiscountPercentage })}
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
                {summaryT('acceptCGV')}
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
                  {summaryT('sending')}
                </>
              ) : (
                summaryT('validateAndSend')
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

