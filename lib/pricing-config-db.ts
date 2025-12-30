import { prisma, withRetry } from './prisma'
import { cache } from './cache'

const CACHE_KEY = 'pricing-config'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export interface PricingConfig {
  textileDiscountPercentage: number // Réduction sur le textile (affichée au client)
  clientProvidedIndexation: number // Indexation quand le client fournit le produit (non affichée, appliquée à l'envoi Odoo)
  expressSurchargePercent: number // Pourcentage de supplément par jour pour express
  individualPackagingPrice: number // Prix par pièce pour l'emballage individuel (€ HT)
  newCartonPrice: number // Prix par carton pour un carton neuf (€ HT)
  vectorizationPrice: number // Prix pour la vectorisation d'un logo par le graphiste (€ HT)
  courierPricePerKm: number // Prix par km pour le coursier (€ HT)
  courierMinimumFee: number // Forfait minimum pour le coursier (€ HT)
}

export const defaultPricingConfig: PricingConfig = {
  textileDiscountPercentage: 30, // 30% de réduction sur le textile
  clientProvidedIndexation: 10, // 10% d'indexation quand le client fournit le produit
  expressSurchargePercent: 10, // 10% par jour pour express
  individualPackagingPrice: 0.10, // 0.10€ par pièce pour l'emballage individuel
  newCartonPrice: 2.00, // 2.00€ par carton pour un carton neuf
  vectorizationPrice: 25.00, // 25.00€ pour la vectorisation d'un logo par le graphiste
  courierPricePerKm: 1.50, // 1.50€ par km pour le coursier
  courierMinimumFee: 15.00, // 15.00€ forfait minimum pour le coursier
}

/**
 * Charger la configuration des facteurs de prix depuis la base de données (avec cache)
 */
export async function loadPricingConfig(): Promise<PricingConfig> {
  // Vérifier le cache d'abord
  const cached = cache.get<PricingConfig>(CACHE_KEY)
  if (cached) {
    return cached
  }
  
  try {
    console.log('🔍 Tentative de chargement de la configuration depuis la base de données...')
    
    // Utiliser withRetry pour gérer les erreurs de verrouillage SQLite
    let config = await withRetry(async () => {
      return await prisma.pricingConfig.findUnique({
      where: { id: 'singleton' },
      })
    })
    
    if (!config) {
      // Si aucune configuration, créer avec les valeurs par défaut
      console.log('📝 Aucune configuration de prix trouvée, initialisation avec les valeurs par défaut')
      try {
        config = await withRetry(async () => {
          return await prisma.pricingConfig.create({
        data: {
          id: 'singleton',
          ...defaultPricingConfig,
        },
      })
        })
        console.log('✅ Configuration par défaut créée dans la base de données')
      } catch (createError) {
        console.error('❌ Erreur lors de la création de la configuration par défaut:', createError)
        // Si la création échoue, retourner les valeurs par défaut quand même
        return defaultPricingConfig
      }
    } else {
      console.log('✅ Configuration trouvée dans la base de données')
    }
    
    const result = {
      textileDiscountPercentage: config.textileDiscountPercentage,
      clientProvidedIndexation: config.clientProvidedIndexation,
      expressSurchargePercent: config.expressSurchargePercent,
      individualPackagingPrice: config.individualPackagingPrice ?? defaultPricingConfig.individualPackagingPrice,
      newCartonPrice: config.newCartonPrice ?? defaultPricingConfig.newCartonPrice,
      vectorizationPrice: config.vectorizationPrice ?? defaultPricingConfig.vectorizationPrice,
      courierPricePerKm: config.courierPricePerKm ?? defaultPricingConfig.courierPricePerKm,
      courierMinimumFee: config.courierMinimumFee ?? defaultPricingConfig.courierMinimumFee,
    }
    
    // Mettre en cache le résultat
    cache.set(CACHE_KEY, result, CACHE_TTL)
    
    console.log('✅ Configuration chargée:', result)
    return result
  } catch (error) {
    console.error('❌ Erreur lors du chargement de la configuration des prix:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    console.log('⚠️ Retour des valeurs par défaut en raison de l\'erreur')
    return defaultPricingConfig
  }
}

/**
 * Sauvegarder la configuration des facteurs de prix dans la base de données
 */
export async function savePricingConfig(config: PricingConfig): Promise<void> {
  try {
    // S'assurer que toutes les valeurs sont définies (utiliser les valeurs par défaut si nécessaire)
    const configToSave: PricingConfig = {
      textileDiscountPercentage: config.textileDiscountPercentage ?? defaultPricingConfig.textileDiscountPercentage,
      clientProvidedIndexation: config.clientProvidedIndexation ?? defaultPricingConfig.clientProvidedIndexation,
      expressSurchargePercent: config.expressSurchargePercent ?? defaultPricingConfig.expressSurchargePercent,
      individualPackagingPrice: config.individualPackagingPrice ?? defaultPricingConfig.individualPackagingPrice,
      newCartonPrice: config.newCartonPrice ?? defaultPricingConfig.newCartonPrice,
      vectorizationPrice: config.vectorizationPrice ?? defaultPricingConfig.vectorizationPrice,
      courierPricePerKm: config.courierPricePerKm ?? defaultPricingConfig.courierPricePerKm,
      courierMinimumFee: config.courierMinimumFee ?? defaultPricingConfig.courierMinimumFee,
    }
    
    console.log('💾 Sauvegarde de la configuration:', configToSave)
    
    // Utiliser withRetry pour gérer les erreurs de verrouillage SQLite
    await withRetry(async () => {
    await prisma.pricingConfig.upsert({
      where: { id: 'singleton' },
      update: {
          textileDiscountPercentage: configToSave.textileDiscountPercentage,
          clientProvidedIndexation: configToSave.clientProvidedIndexation,
          expressSurchargePercent: configToSave.expressSurchargePercent,
          individualPackagingPrice: configToSave.individualPackagingPrice,
          newCartonPrice: configToSave.newCartonPrice,
          vectorizationPrice: configToSave.vectorizationPrice,
          courierPricePerKm: configToSave.courierPricePerKm,
          courierMinimumFee: configToSave.courierMinimumFee,
      },
      create: {
        id: 'singleton',
          ...configToSave,
      },
      })
    })
    
    // Invalider le cache après sauvegarde
    cache.delete(CACHE_KEY)
    
    console.log('✅ Configuration des prix sauvegardée dans la base de données')
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration des prix:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    throw error
  }
}

