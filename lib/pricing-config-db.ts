import { prisma } from './prisma'

export interface PricingConfig {
  textileDiscountPercentage: number // Réduction sur le textile (affichée au client)
  clientProvidedIndexation: number // Indexation quand le client fournit le produit (non affichée, appliquée à l'envoi Odoo)
  expressSurchargePercent: number // Pourcentage de supplément par jour pour express
  individualPackagingPrice: number // Prix par pièce pour l'emballage individuel (€ HT)
  newCartonPrice: number // Prix par carton pour un carton neuf (€ HT)
  vectorizationPrice: number // Prix pour la vectorisation d'un logo par le graphiste (€ HT)
}

export const defaultPricingConfig: PricingConfig = {
  textileDiscountPercentage: 30, // 30% de réduction sur le textile
  clientProvidedIndexation: 10, // 10% d'indexation quand le client fournit le produit
  expressSurchargePercent: 10, // 10% par jour pour express
  individualPackagingPrice: 0.10, // 0.10€ par pièce pour l'emballage individuel
  newCartonPrice: 2.00, // 2.00€ par carton pour un carton neuf
  vectorizationPrice: 25.00, // 25.00€ pour la vectorisation d'un logo par le graphiste
}

/**
 * Charger la configuration des facteurs de prix depuis la base de données
 */
export async function loadPricingConfig(): Promise<PricingConfig> {
  try {
    let config = await prisma.pricingConfig.findUnique({
      where: { id: 'singleton' },
    })
    
    if (!config) {
      // Si aucune configuration, créer avec les valeurs par défaut
      console.log('📝 Aucune configuration de prix trouvée, initialisation avec les valeurs par défaut')
      config = await prisma.pricingConfig.create({
        data: {
          id: 'singleton',
          ...defaultPricingConfig,
        },
      })
    }
    
    return {
      textileDiscountPercentage: config.textileDiscountPercentage,
      clientProvidedIndexation: config.clientProvidedIndexation,
      expressSurchargePercent: config.expressSurchargePercent,
      individualPackagingPrice: config.individualPackagingPrice ?? defaultPricingConfig.individualPackagingPrice,
      newCartonPrice: config.newCartonPrice ?? defaultPricingConfig.newCartonPrice,
      vectorizationPrice: config.vectorizationPrice ?? defaultPricingConfig.vectorizationPrice,
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement de la configuration des prix:', error)
    return defaultPricingConfig
  }
}

/**
 * Sauvegarder la configuration des facteurs de prix dans la base de données
 */
export async function savePricingConfig(config: PricingConfig): Promise<void> {
  try {
    await prisma.pricingConfig.upsert({
      where: { id: 'singleton' },
      update: {
        textileDiscountPercentage: config.textileDiscountPercentage,
        clientProvidedIndexation: config.clientProvidedIndexation,
        expressSurchargePercent: config.expressSurchargePercent,
        individualPackagingPrice: config.individualPackagingPrice,
        newCartonPrice: config.newCartonPrice,
        vectorizationPrice: config.vectorizationPrice,
      },
      create: {
        id: 'singleton',
        ...defaultPricingConfig,
        ...config,
      },
    })
    
    console.log('✅ Configuration des prix sauvegardée dans la base de données')
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration des prix:', error)
    throw error
  }
}

