import { prisma } from './prisma'

export interface PricingConfig {
  textileDiscountPercentage: number // Réduction sur le textile (affichée au client)
  clientProvidedIndexation: number // Indexation quand le client fournit le produit (non affichée, appliquée à l'envoi Odoo)
  expressSurchargePercent: number // Pourcentage de supplément par jour pour express
}

export const defaultPricingConfig: PricingConfig = {
  textileDiscountPercentage: 30, // 30% de réduction sur le textile
  clientProvidedIndexation: 10, // 10% d'indexation quand le client fournit le produit
  expressSurchargePercent: 10, // 10% par jour pour express
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
      },
      create: {
        id: 'singleton',
        ...config,
      },
    })
    
    console.log('✅ Configuration des prix sauvegardée dans la base de données')
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration des prix:', error)
    throw error
  }
}

