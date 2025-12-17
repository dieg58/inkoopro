/**
 * Configuration des facteurs de prix (côté client)
 * Utilise l'API pour charger la configuration
 */

export interface PricingConfig {
  textileDiscountPercentage: number // Réduction sur le textile (affichée au client)
  clientProvidedIndexation: number // Indexation quand le client fournit le produit (non affichée, appliquée à l'envoi Odoo)
}

/**
 * Charger la configuration des prix depuis l'API (côté client)
 */
export async function loadPricingConfigClient(): Promise<PricingConfig> {
  try {
    const response = await fetch('/api/admin/pricing-config')
    const data = await response.json()
    if (data.success && data.config) {
      return data.config
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration des prix:', error)
  }
  // Retourner les valeurs par défaut en cas d'erreur
  return {
    textileDiscountPercentage: 30,
    clientProvidedIndexation: 10,
  }
}

