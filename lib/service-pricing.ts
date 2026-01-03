import { ServicePricing, QuantityRange, SerigraphiePricing, BroderiePricing, DTFPricing } from '@/types'

/**
 * Configuration par défaut des prix des services avec prix fictifs
 */
export const defaultPricing: ServicePricing[] = [
  {
    technique: 'serigraphie',
    minQuantity: 1,
    quantityRanges: [
      { min: 1, max: 10, label: '1-10' },
      { min: 11, max: 50, label: '11-50' },
      { min: 51, max: 100, label: '51-100' },
      { min: 101, max: null, label: '101+' },
    ],
    colorCounts: [1, 2, 3, 4, 5, 6],
    fixedFeePerColor: 25, // 25€ par couleur
    options: [
      { id: 'discharge', name: 'Discharge', surchargePercentage: 15 },
      { id: 'stop-sublimation', name: 'Stop sublimation', surchargePercentage: 20 },
      { id: 'gold', name: 'Gold', surchargePercentage: 25 },
      { id: 'phospho', name: 'Phospho', surchargePercentage: 30 },
    ],
    pricesClair: {
      // Prix pour textile clair
      // Quantité 1-10
      '1-10-1': 2.50, '1-10-2': 2.20, '1-10-3': 2.00, '1-10-4': 1.90, '1-10-5': 1.80, '1-10-6': 1.70,
      // Quantité 11-50
      '11-50-1': 2.00, '11-50-2': 1.80, '11-50-3': 1.60, '11-50-4': 1.50, '11-50-5': 1.40, '11-50-6': 1.30,
      // Quantité 51-100
      '51-100-1': 1.50, '51-100-2': 1.30, '51-100-3': 1.20, '51-100-4': 1.10, '51-100-5': 1.00, '51-100-6': 0.95,
      // Quantité 101+
      '101+-1': 1.20, '101+-2': 1.00, '101+-3': 0.90, '101+-4': 0.85, '101+-5': 0.80, '101+-6': 0.75,
    },
    pricesFonce: {
      // Prix pour textile foncé (généralement plus cher)
      // Quantité 1-10
      '1-10-1': 2.70, '1-10-2': 2.40, '1-10-3': 2.20, '1-10-4': 2.10, '1-10-5': 2.00, '1-10-6': 1.90,
      // Quantité 11-50
      '11-50-1': 2.20, '11-50-2': 2.00, '11-50-3': 1.80, '11-50-4': 1.70, '11-50-5': 1.60, '11-50-6': 1.50,
      // Quantité 51-100
      '51-100-1': 1.70, '51-100-2': 1.50, '51-100-3': 1.40, '51-100-4': 1.30, '51-100-5': 1.20, '51-100-6': 1.15,
      // Quantité 101+
      '101+-1': 1.40, '101+-2': 1.20, '101+-3': 1.10, '101+-4': 1.05, '101+-5': 1.00, '101+-6': 0.95,
    },
  },
  {
    technique: 'broderie',
    minQuantity: 1,
    quantityRanges: [
      { min: 1, max: 10, label: '1-10' },
      { min: 11, max: 50, label: '11-50' },
      { min: 51, max: 100, label: '51-100' },
      { min: 101, max: null, label: '101+' },
    ],
    pointRangesPetite: [
      { min: 0, max: 5000, label: '0-5000' },
      { min: 5001, max: 10000, label: '5001-10000' },
      { min: 10001, max: 20000, label: '10001-20000' },
      { min: 20001, max: null, label: '20001+' },
    ],
    pointRangesGrande: [
      { min: 0, max: 5000, label: '0-5000' },
      { min: 5001, max: 10000, label: '5001-10000' },
      { min: 10001, max: 20000, label: '10001-20000' },
      { min: 20001, max: null, label: '20001+' },
    ],
    fixedFeeSmallDigitization: 40, // 40€ pour petite digitalisation
    fixedFeeLargeDigitization: 60, // 60€ pour grande digitalisation
    smallDigitizationThreshold: 10000, // Seuil à 10000 points
    pricesPetite: {
      // Prix pour petite broderie (max 10x10cm)
      // Quantité 1-10
      '1-10-0-5000': 3.50, '1-10-5001-10000': 4.00, '1-10-10001-20000': 4.50, '1-10-20001+': 5.00,
      // Quantité 11-50
      '11-50-0-5000': 3.00, '11-50-5001-10000': 3.50, '11-50-10001-20000': 4.00, '11-50-20001+': 4.50,
      // Quantité 51-100
      '51-100-0-5000': 2.50, '51-100-5001-10000': 3.00, '51-100-10001-20000': 3.50, '51-100-20001+': 4.00,
      // Quantité 101+
      '101+-0-5000': 2.00, '101+-5001-10000': 2.50, '101+-10001-20000': 3.00, '101+-20001+': 3.50,
    },
    pricesGrande: {
      // Prix pour grande broderie (max 20x25cm)
      // Quantité 1-10
      '1-10-0-5000': 4.50, '1-10-5001-10000': 5.00, '1-10-10001-20000': 5.50, '1-10-20001+': 6.00,
      // Quantité 11-50
      '11-50-0-5000': 4.00, '11-50-5001-10000': 4.50, '11-50-10001-20000': 5.00, '11-50-20001+': 5.50,
      // Quantité 51-100
      '51-100-0-5000': 3.50, '51-100-5001-10000': 4.00, '51-100-10001-20000': 4.50, '51-100-20001+': 5.00,
      // Quantité 101+
      '101+-0-5000': 3.00, '101+-5001-10000': 3.50, '101+-10001-20000': 4.00, '101+-20001+': 4.50,
    },
  },
  {
    technique: 'dtf',
    minQuantity: 1,
    quantityRanges: [
      { min: 1, max: 10, label: '1-10' },
      { min: 11, max: 50, label: '11-50' },
      { min: 51, max: 100, label: '51-100' },
      { min: 101, max: null, label: '101+' },
    ],
    dimensions: ['10x10 cm', '15x15 cm', '20x20 cm', '25x25 cm', '30x30 cm', 'Personnalisé'],
    prices: {
      // Quantité 1-10
      '1-10-10x10 cm': 4.50, '1-10-15x15 cm': 5.50, '1-10-20x20 cm': 6.50, '1-10-25x25 cm': 7.50, '1-10-30x30 cm': 8.50, '1-10-Personnalisé': 9.00,
      // Quantité 11-50
      '11-50-10x10 cm': 3.50, '11-50-15x15 cm': 4.50, '11-50-20x20 cm': 5.50, '11-50-25x25 cm': 6.50, '11-50-30x30 cm': 7.50, '11-50-Personnalisé': 8.00,
      // Quantité 51-100
      '51-100-10x10 cm': 2.50, '51-100-15x15 cm': 3.50, '51-100-20x20 cm': 4.50, '51-100-25x25 cm': 5.50, '51-100-30x30 cm': 6.50, '51-100-Personnalisé': 7.00,
      // Quantité 101+
      '101+-10x10 cm': 2.00, '101+-15x15 cm': 3.00, '101+-20x20 cm': 4.00, '101+-25x25 cm': 5.00, '101+-30x30 cm': 6.00, '101+-Personnalisé': 6.50,
    },
  },
]

/**
 * Trouver la fourchette de quantité correspondante
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
 * Calculer le prix d'un service de sérigraphie
 * Inclut les frais fixes par couleur
 */
export function calculateSerigraphiePrice(
  quantity: number,
  colorCount: number,
  pricing: SerigraphiePricing
): number | null {
  const quantityRange = findQuantityRange(quantity, pricing.quantityRanges)
  if (!quantityRange) return null
  
  const key = `${quantityRange.label}-${colorCount}`
  const unitPrice = (pricing as any).prices?.[key] || (pricing as any).pricesClair?.[key] || (pricing as any).pricesFonce?.[key]
  if (unitPrice === null || unitPrice === undefined) return null
  
  // Prix unitaire × quantité + frais fixes (25€ par couleur)
  const totalPrice = (unitPrice * quantity) + (pricing.fixedFeePerColor * colorCount)
  return totalPrice
}

/**
 * Calculer le prix d'un service de broderie
 * Inclut les frais fixes de digitalisation
 * @param quantity - Quantité de pièces
 * @param pointCount - Nombre de points
 * @param pricing - Configuration des prix
 * @param embroiderySize - Taille de la broderie : 'petite' (max 10x10cm) ou 'grande' (max 20x25cm)
 */
export function calculateBroderiePrice(
  quantity: number,
  pointCount: number,
  pricing: BroderiePricing,
  embroiderySize: 'petite' | 'grande' = 'petite'
): number | null {
  const quantityRange = findQuantityRange(quantity, pricing.quantityRanges)
  if (!quantityRange) return null
  
  // Utiliser la bonne fourchette de points selon la taille de broderie
  const pointRanges = embroiderySize === 'petite' ? pricing.pointRangesPetite : pricing.pointRangesGrande
  const pointRange = pointRanges.find(range => 
    pointCount >= range.min && (range.max === null || pointCount <= range.max)
  )
  if (!pointRange) return null
  
  const key = `${quantityRange.label}-${pointRange.label}`
  
  // Utiliser le bon tableau de prix selon la taille
  const prices = embroiderySize === 'petite' ? pricing.pricesPetite : pricing.pricesGrande
  const unitPrice = prices[key]
  if (unitPrice === null || unitPrice === undefined) return null
  
  // Déterminer les frais de digitalisation selon le nombre de points
  const digitizationFee = pointCount <= pricing.smallDigitizationThreshold
    ? pricing.fixedFeeSmallDigitization // 40€ pour petite digitalisation
    : pricing.fixedFeeLargeDigitization // 60€ pour grande digitalisation
  
  // Prix unitaire × quantité + frais fixes de digitalisation
  const totalPrice = (unitPrice * quantity) + digitizationFee
  return totalPrice
}

/**
 * Calculer le prix d'un service DTF
 */
export function calculateDTFPrice(
  quantity: number,
  dimension: string,
  pricing: DTFPricing
): number | null {
  const quantityRange = findQuantityRange(quantity, pricing.quantityRanges)
  if (!quantityRange) return null
  
  const key = `${quantityRange.label}-${dimension}`
  return pricing.prices[key] ?? null
}

/**
 * Obtenir la quantité minimum pour une technique
 */
export function getMinQuantityForTechnique(
  technique: 'serigraphie' | 'broderie' | 'dtf',
  pricing: ServicePricing[]
): number {
  // Vérifier que pricing est un tableau valide
  if (!Array.isArray(pricing) || pricing.length === 0) {
    console.warn(`⚠️ Pricing invalide ou vide pour ${technique}, utilisation des valeurs par défaut`)
    const defaultTechniquePricing = defaultPricing.find((p: ServicePricing) => p.technique === technique)
    if (defaultTechniquePricing && typeof defaultTechniquePricing.minQuantity === 'number') {
      console.log(`📊 Quantité minimum pour ${technique}: ${defaultTechniquePricing.minQuantity} (valeur par défaut, pricing vide)`)
      return defaultTechniquePricing.minQuantity
    }
    return 1
  }
  
  const techniquePricing = pricing.find(p => p.technique === technique)
  
  // Si on trouve le pricing et que minQuantity est défini, l'utiliser
  if (techniquePricing && typeof techniquePricing.minQuantity === 'number' && techniquePricing.minQuantity >= 0) {
    console.log(`📊 Quantité minimum pour ${technique}: ${techniquePricing.minQuantity} (depuis DB)`)
    return techniquePricing.minQuantity
  }
  
  // Si pas trouvé, utiliser les valeurs par défaut depuis defaultPricing
  const defaultTechniquePricing = defaultPricing.find((p: ServicePricing) => p.technique === technique)
  if (defaultTechniquePricing && typeof defaultTechniquePricing.minQuantity === 'number') {
    console.log(`📊 Quantité minimum pour ${technique}: ${defaultTechniquePricing.minQuantity} (valeur par défaut)`)
    return defaultTechniquePricing.minQuantity
  }
  
  console.warn(`⚠️ Aucune quantité minimum trouvée pour ${technique}, utilisation de 1 par défaut`)
  return 1 // Valeur par défaut si vraiment rien trouvé
}

