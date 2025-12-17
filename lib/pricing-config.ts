import { promises as fs } from 'fs'
import path from 'path'

/**
 * Chemin du fichier de configuration des facteurs de prix
 */
const CONFIG_FILE_PATH = path.join(process.cwd(), '.cache', 'pricing-config.json')

/**
 * Configuration par défaut des facteurs de prix
 */
export interface PricingConfig {
  textileDiscountPercentage: number // Réduction sur le textile (affichée au client)
  clientProvidedIndexation: number // Indexation quand le client fournit le produit (non affichée, appliquée à l'envoi Odoo)
}

export const defaultPricingConfig: PricingConfig = {
  textileDiscountPercentage: 30, // 30% de réduction sur le textile
  clientProvidedIndexation: 10, // 10% d'indexation quand le client fournit le produit
}

/**
 * Charger la configuration des facteurs de prix depuis le fichier
 */
export async function loadPricingConfig(): Promise<PricingConfig> {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8')
    const config = JSON.parse(data) as PricingConfig
    return config
  } catch (error) {
    // Si le fichier n'existe pas, retourner la configuration par défaut
    console.log('📝 Fichier de configuration des prix non trouvé, utilisation de la configuration par défaut')
    return defaultPricingConfig
  }
}

/**
 * Sauvegarder la configuration des facteurs de prix dans le fichier
 */
export async function savePricingConfig(config: PricingConfig): Promise<void> {
  try {
    // Créer le dossier .cache s'il n'existe pas
    const cacheDir = path.dirname(CONFIG_FILE_PATH)
    await fs.mkdir(cacheDir, { recursive: true })
    
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8')
    console.log('✅ Configuration des prix sauvegardée')
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration des prix:', error)
    throw error
  }
}

