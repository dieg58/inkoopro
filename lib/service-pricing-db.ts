import { ServicePricing } from '@/types'
import { prisma, withRetry } from './prisma'
import { defaultPricing } from './service-pricing'

/**
 * Charger les prix des services depuis la base de données
 */
export async function loadServicePricing(): Promise<ServicePricing[]> {
  try {
    const pricingRecords = await prisma.servicePricing.findMany()
    
    if (pricingRecords.length === 0) {
      // Si aucune donnée, initialiser avec les valeurs par défaut
      console.log('📝 Aucune configuration de prix trouvée, initialisation avec les valeurs par défaut')
      await initializeServicePricing()
      return defaultPricing
    }
    
    // Convertir les enregistrements DB en format ServicePricing
    return pricingRecords.map(record => {
      const base: any = {
        technique: record.technique as 'serigraphie' | 'broderie' | 'dtf',
        minQuantity: record.minQuantity,
        quantityRanges: JSON.parse(record.quantityRanges),
      }
      
      // Pour la sérigraphie, utiliser pricesClair et pricesFonce si disponibles
      if (record.technique === 'serigraphie') {
        if (record.pricesClair && record.pricesFonce) {
          base.pricesClair = JSON.parse(record.pricesClair)
          base.pricesFonce = JSON.parse(record.pricesFonce)
        } else {
          // Rétrocompatibilité : utiliser prices si pricesClair/pricesFonce n'existent pas
          const prices = JSON.parse(record.prices)
          base.pricesClair = prices
          base.pricesFonce = prices
        }
      } else if (record.technique === 'broderie') {
        // Pour la broderie, utiliser pricesPetite et pricesGrande si disponibles
        if (record.pricesPetite && record.pricesGrande) {
          base.pricesPetite = JSON.parse(record.pricesPetite)
          base.pricesGrande = JSON.parse(record.pricesGrande)
        } else {
          // Rétrocompatibilité : utiliser prices si pricesPetite/pricesGrande n'existent pas
          const prices = JSON.parse(record.prices)
          base.pricesPetite = prices
          base.pricesGrande = prices
        }
      } else {
        // Pour DTF, utiliser prices
        base.prices = JSON.parse(record.prices)
      }
      
      if (record.colorCounts) {
        base.colorCounts = JSON.parse(record.colorCounts)
      }
      if (record.pointRanges) {
        base.pointRanges = JSON.parse(record.pointRanges)
      }
      if (record.dimensions) {
        base.dimensions = JSON.parse(record.dimensions)
      }
      if (record.fixedFeePerColor !== null) {
        base.fixedFeePerColor = record.fixedFeePerColor
      }
      if (record.fixedFeeSmallDigitization !== null) {
        base.fixedFeeSmallDigitization = record.fixedFeeSmallDigitization
      }
      if (record.fixedFeeLargeDigitization !== null) {
        base.fixedFeeLargeDigitization = record.fixedFeeLargeDigitization
      }
      if (record.smallDigitizationThreshold !== null) {
        base.smallDigitizationThreshold = record.smallDigitizationThreshold
      }
      if (record.serigraphieOptions) {
        base.options = JSON.parse(record.serigraphieOptions)
      } else if (record.technique === 'serigraphie') {
        // Valeurs par défaut si pas de configuration
        base.options = [
          { id: 'discharge', name: 'Discharge', surchargePercentage: 15 },
          { id: 'stop-sublimation', name: 'Stop sublimation', surchargePercentage: 20 },
          { id: 'gold', name: 'Gold', surchargePercentage: 25 },
          { id: 'phospho', name: 'Phospho', surchargePercentage: 30 },
        ]
      }
      
      return base as ServicePricing
    })
  } catch (error) {
    console.error('❌ Erreur lors du chargement des prix des services:', error)
    return defaultPricing
  }
}

/**
 * Sauvegarder les prix des services dans la base de données
 */
export async function saveServicePricing(pricing: ServicePricing[]): Promise<void> {
  try {
    // Utiliser withRetry pour gérer les erreurs de verrouillage SQLite
    await withRetry(async () => {
      // Supprimer toutes les configurations existantes
      await prisma.servicePricing.deleteMany()
      
      // Insérer les nouvelles configurations
      await prisma.servicePricing.createMany({
      data: pricing.map(p => {
        const baseData: any = {
          technique: p.technique,
          minQuantity: p.minQuantity,
          quantityRanges: JSON.stringify(p.quantityRanges),
          colorCounts: p.technique === 'serigraphie' ? JSON.stringify((p as any).colorCounts) : null,
          pointRanges: p.technique === 'broderie' ? JSON.stringify((p as any).pointRanges) : null,
          dimensions: p.technique === 'dtf' ? JSON.stringify((p as any).dimensions) : null,
          fixedFeePerColor: p.technique === 'serigraphie' ? (p as any).fixedFeePerColor : null,
          fixedFeeSmallDigitization: p.technique === 'broderie' ? (p as any).fixedFeeSmallDigitization : null,
          fixedFeeLargeDigitization: p.technique === 'broderie' ? (p as any).fixedFeeLargeDigitization : null,
          smallDigitizationThreshold: p.technique === 'broderie' ? (p as any).smallDigitizationThreshold : null,
          serigraphieOptions: p.technique === 'serigraphie' ? JSON.stringify((p as any).options || []) : null,
        }
        
        // Pour la sérigraphie, utiliser pricesClair et pricesFonce
        if (p.technique === 'serigraphie') {
          const serigraphiePricing = p as any
          baseData.pricesClair = JSON.stringify(serigraphiePricing.pricesClair || serigraphiePricing.prices || {})
          baseData.pricesFonce = JSON.stringify(serigraphiePricing.pricesFonce || serigraphiePricing.prices || {})
          baseData.prices = JSON.stringify({}) // Garder pour rétrocompatibilité
          baseData.pricesPetite = null
          baseData.pricesGrande = null
        } else if (p.technique === 'broderie') {
          // Pour la broderie, utiliser pricesPetite et pricesGrande
          const broderiePricing = p as any
          baseData.pricesPetite = JSON.stringify(broderiePricing.pricesPetite || broderiePricing.prices || {})
          baseData.pricesGrande = JSON.stringify(broderiePricing.pricesGrande || broderiePricing.prices || {})
          baseData.prices = JSON.stringify({}) // Garder pour rétrocompatibilité
          baseData.pricesClair = null
          baseData.pricesFonce = null
        } else {
          // Pour DTF, utiliser prices
          baseData.prices = JSON.stringify((p as any).prices || {})
          baseData.pricesClair = null
          baseData.pricesFonce = null
          baseData.pricesPetite = null
          baseData.pricesGrande = null
        }
        
        return baseData
      })
    })
    })
    
    console.log('✅ Prix des services sauvegardés dans la base de données')
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des prix des services:', error)
    throw error
  }
}

/**
 * Initialiser les prix des services avec les valeurs par défaut
 */
async function initializeServicePricing(): Promise<void> {
  try {
    await saveServicePricing(defaultPricing)
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des prix des services:', error)
  }
}

