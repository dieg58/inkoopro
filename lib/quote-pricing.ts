import { QuoteItem, Delay, Delivery } from '@/types'
import { ServicePricing, QuantityRange } from '@/types'
import { calculateExpressSurcharge } from './delivery-dates'
import { calculateShippingCost, calculateShippingCostSync, calculateCartons } from './shipping'

interface PriceDetails {
  unitPrice: number
  quantity: number
  fixedFees: number
  optionsSurcharge: number
  expressSurcharge: number
  total: number
  emplacements: number
}

interface QuoteTotal {
  productsTotal: number
  servicesTotal: number
  shippingCost: number
  packagingCost: number
  cartonCost: number
  vectorizationCost: number
  expressSurchargeTotal: number
  grandTotal: number
  itemDetails: Array<{
    item: QuoteItem
    priceDetails: PriceDetails | null
  }>
}

/**
 * Trouve la fourchette de quantité
 */
function findQuantityRange(quantity: number, ranges: QuantityRange[]): QuantityRange | null {
  for (const range of ranges) {
    if (quantity >= range.min && (range.max === null || quantity <= range.max)) {
      return range
    }
  }
  return null
}

/**
 * Calcule le détail du prix d'un service
 */
function calculateServicePriceDetails(
  item: QuoteItem,
  servicePricing: ServicePricing[],
  delay?: Delay
): PriceDetails | null {
  if (!item.technique || !item.techniqueOptions) return null

  const pricing = servicePricing.find(p => p.technique === item.technique)
  if (!pricing) return null

  const totalQuantity = item.totalQuantity || 0
  if (totalQuantity === 0) return null

  if (item.technique === 'serigraphie') {
    const serigraphieOptions = item.techniqueOptions as any
    const colorCount = serigraphieOptions.nombreCouleurs || 1
    const textileType = serigraphieOptions.textileType || 'clair'
    const selectedOptions = serigraphieOptions.selectedOptions || []
    const emplacements = 1
    const serigraphiePricing = pricing as any
    
    const quantityRange = findQuantityRange(totalQuantity, serigraphiePricing.quantityRanges)
    if (!quantityRange) {
      console.error('❌ Sérigraphie: Aucune fourchette de quantité trouvée pour', totalQuantity)
      return null
    }
    
    const key = `${quantityRange.label}-${colorCount}`
    const prices = textileType === 'clair' 
      ? (serigraphiePricing.pricesClair || serigraphiePricing.prices) 
      : (serigraphiePricing.pricesFonce || serigraphiePricing.prices)
    
    // Vérifier que prices existe et est un objet
    if (!prices || typeof prices !== 'object') {
      console.error('❌ Sérigraphie: prices est invalide', {
        textileType,
        hasPricesClair: !!serigraphiePricing.pricesClair,
        hasPricesFonce: !!serigraphiePricing.pricesFonce,
        hasPrices: !!serigraphiePricing.prices,
        pricesType: typeof prices,
      })
      return null
    }
    
    const unitPrice = prices[key]
    if (unitPrice === undefined || unitPrice === null) {
      console.error('❌ Sérigraphie: Prix non trouvé pour la clé', {
        key,
        quantity: totalQuantity,
        quantityRange: quantityRange.label,
        colorCount,
        textileType,
        availableKeys: Object.keys(prices).slice(0, 10), // Afficher les 10 premières clés
        pricingKeys: Object.keys(serigraphiePricing),
      })
      return null
    }
    
    const fixedFees = (serigraphiePricing.fixedFeePerColor || 0) * colorCount
    
    const basePrice = (unitPrice * totalQuantity) + fixedFees
    let optionsSurcharge = 0
    if (selectedOptions.length > 0 && serigraphiePricing.options) {
      // Calculer le surcoût de chaque option individuellement
      selectedOptions.forEach((optionId: string) => {
        const option = serigraphiePricing.options.find((opt: any) => opt.id === optionId)
        if (option?.surchargePercentage) {
          optionsSurcharge += (basePrice * option.surchargePercentage) / 100
        }
      })
    }
    
    const baseTotal = (basePrice + optionsSurcharge) * emplacements
    
    let expressSurcharge = 0
    if (delay) {
      const standardDays = 10
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
      optionsSurcharge,
      expressSurcharge,
      total,
      emplacements,
    }
  } else if (item.technique === 'broderie') {
    const broderieOptions = item.techniqueOptions as any
    const pointCount = broderieOptions.nombrePoints || 0
    const embroiderySize = broderieOptions.embroiderySize || 'petite'
    const emplacements = 1
    const broderiePricing = pricing as any
    
    const quantityRange = findQuantityRange(totalQuantity, broderiePricing.quantityRanges)
    if (!quantityRange) return null
    
    // Utiliser la bonne fourchette de points selon la taille de broderie
    const pointRanges = embroiderySize === 'petite' 
      ? (broderiePricing.pointRangesPetite || broderiePricing.pointRanges) 
      : (broderiePricing.pointRangesGrande || broderiePricing.pointRanges)
    
    if (!pointRanges || !Array.isArray(pointRanges)) {
      console.error('❌ Broderie: pointRanges invalide', {
        embroiderySize,
        hasPointRangesPetite: !!broderiePricing.pointRangesPetite,
        hasPointRangesGrande: !!broderiePricing.pointRangesGrande,
        hasPointRanges: !!broderiePricing.pointRanges,
      })
      return null
    }
    
    const pointRange = pointRanges.find((range: any) => 
      pointCount >= range.min && (range.max === null || pointCount <= range.max)
    )
    if (!pointRange) {
      console.error('❌ Broderie: Aucune fourchette de points trouvée', {
        pointCount,
        availableRanges: pointRanges.map((r: any) => `${r.min}-${r.max}`),
      })
      return null
    }
    
    const key = `${quantityRange.label}-${pointRange.label}`
    const prices = embroiderySize === 'petite' 
      ? (broderiePricing.pricesPetite || broderiePricing.prices) 
      : (broderiePricing.pricesGrande || broderiePricing.prices)
    const unitPrice = prices[key] || 0
    
    const fixedFees = pointCount <= (broderiePricing.smallDigitizationThreshold || 10000)
      ? (broderiePricing.fixedFeeSmallDigitization || 0)
      : (broderiePricing.fixedFeeLargeDigitization || 0)
    
    const baseTotal = ((unitPrice * totalQuantity) + fixedFees) * emplacements
    
    let expressSurcharge = 0
    if (delay) {
      const standardDays = 10
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
      optionsSurcharge: 0,
      expressSurcharge,
      total,
      emplacements,
    }
  } else if (item.technique === 'dtf') {
    const dtfOptions = item.techniqueOptions as any
    const dimension = dtfOptions.dimension || '10x10 cm'
    const emplacements = 1
    const dtfPricing = pricing as any
    
    const quantityRange = findQuantityRange(totalQuantity, dtfPricing.quantityRanges)
    if (!quantityRange) return null
    
    const key = `${quantityRange.label}-${dimension}`
    const unitPrice = dtfPricing.prices[key] || 0
    
    const baseTotal = (unitPrice * totalQuantity) * emplacements
    
    let expressSurcharge = 0
    if (delay) {
      const standardDays = 10
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
      fixedFees: 0,
      optionsSurcharge: 0,
      expressSurcharge,
      total,
      emplacements,
    }
  }

  return null
}

/**
 * Calcule le total complet d'un devis
 */
export async function calculateQuoteTotal(
  items: QuoteItem[],
  delivery: Delivery,
  delay?: Delay,
  pricingConfig?: {
    individualPackagingPrice: number
    newCartonPrice: number
    vectorizationPrice: number
  }
): Promise<QuoteTotal> {
  // Charger les prix des services
  const { loadServicePricing } = await import('./service-pricing-db')
  const servicePricing = await loadServicePricing()

  // Charger la config de prix si non fournie
  let config = pricingConfig
  if (!config) {
    const { loadPricingConfig } = await import('./pricing-config-db')
    const loadedConfig = await loadPricingConfig()
    config = {
      individualPackagingPrice: loadedConfig.individualPackagingPrice || 0,
      newCartonPrice: loadedConfig.newCartonPrice || 0,
      vectorizationPrice: loadedConfig.vectorizationPrice || 0,
    }
  }

  // Calculer les détails de prix pour chaque item
  const itemDetails = items.map(item => ({
    item,
    priceDetails: calculateServicePriceDetails(item, servicePricing, delay),
  }))

  // Total des services
  const servicesTotal = itemDetails.reduce((sum, { priceDetails }) => {
    return sum + (priceDetails?.total || 0)
  }, 0)

  // Total des produits (0 car les prix des produits ne sont pas dans QuoteItem)
  const productsTotal = 0

  // Frais de port
  const selectedProducts = items.map(item => ({
    product: item.product,
    colorQuantities: item.colorQuantities,
  }))
  
  // Calculer les frais de port
  let shippingCost = 0
  if (delivery.type === 'dpd') {
    shippingCost = calculateShippingCostSync(selectedProducts as any)
  } else if (delivery.type === 'courier' && delivery.address) {
    // Pour le coursier, utiliser la fonction async
    shippingCost = await calculateShippingCost(selectedProducts as any, delivery, {
      courierPricePerKm: (config as any).courierPricePerKm,
      courierMinimumFee: (config as any).courierMinimumFee,
    })
  }

  // Emballage individuel
  const totalQuantity = items.reduce((sum, item) => sum + (item.totalQuantity || 0), 0)
  const packagingCost = delivery.individualPackaging
    ? totalQuantity * (config.individualPackagingPrice || 0)
    : 0

  // Cartons neufs
  const cartonsCount = calculateCartons(selectedProducts as any)
  const cartonCost = delivery.newCarton
    ? cartonsCount * (config.newCartonPrice || 0)
    : 0

  // Vectorisation
  const vectorizationCount = items.filter(item => item.files && item.files.length > 0).length
  const vectorizationCost = vectorizationCount * (config.vectorizationPrice || 0)

  // Supplément express total
  const expressSurchargeTotal = itemDetails.reduce((sum, { priceDetails }) => {
    return sum + (priceDetails?.expressSurcharge || 0)
  }, 0)

  // Grand total
  const grandTotal = productsTotal + servicesTotal + shippingCost + packagingCost + cartonCost + vectorizationCost

  return {
    productsTotal,
    servicesTotal,
    shippingCost,
    packagingCost,
    cartonCost,
    vectorizationCost,
    expressSurchargeTotal,
    grandTotal,
    itemDetails,
  }
}

