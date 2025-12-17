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
        prices: JSON.parse(record.prices),
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
      data: pricing.map(p => ({
        technique: p.technique,
        minQuantity: p.minQuantity,
        quantityRanges: JSON.stringify(p.quantityRanges),
        colorCounts: p.technique === 'serigraphie' ? JSON.stringify((p as any).colorCounts) : null,
        pointRanges: p.technique === 'broderie' ? JSON.stringify((p as any).pointRanges) : null,
        dimensions: p.technique === 'dtf' ? JSON.stringify((p as any).dimensions) : null,
        prices: JSON.stringify(p.prices),
        fixedFeePerColor: p.technique === 'serigraphie' ? (p as any).fixedFeePerColor : null,
        fixedFeeSmallDigitization: p.technique === 'broderie' ? (p as any).fixedFeeSmallDigitization : null,
        fixedFeeLargeDigitization: p.technique === 'broderie' ? (p as any).fixedFeeLargeDigitization : null,
        smallDigitizationThreshold: p.technique === 'broderie' ? (p as any).smallDigitizationThreshold : null,
      }))
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

