import { ServicePricing } from '@/types'
import { promises as fs } from 'fs'
import path from 'path'
import { defaultPricing } from './service-pricing'

/**
 * Chemin du fichier de stockage des prix des services
 */
const PRICING_FILE_PATH = path.join(process.cwd(), '.cache', 'service-pricing.json')

/**
 * Charger les prix des services depuis le fichier (côté serveur uniquement)
 */
export async function loadServicePricing(): Promise<ServicePricing[]> {
  try {
    const data = await fs.readFile(PRICING_FILE_PATH, 'utf-8')
    const pricing = JSON.parse(data) as ServicePricing[]
    return pricing
  } catch (error) {
    // Si le fichier n'existe pas, retourner la configuration par défaut
    console.log('📝 Fichier de prix des services non trouvé, utilisation de la configuration par défaut')
    return defaultPricing
  }
}

/**
 * Sauvegarder les prix des services dans le fichier (côté serveur uniquement)
 */
export async function saveServicePricing(pricing: ServicePricing[]): Promise<void> {
  try {
    // Créer le dossier .cache s'il n'existe pas
    const cacheDir = path.dirname(PRICING_FILE_PATH)
    await fs.mkdir(cacheDir, { recursive: true })
    
    await fs.writeFile(PRICING_FILE_PATH, JSON.stringify(pricing, null, 2), 'utf-8')
    console.log('✅ Prix des services sauvegardés')
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des prix des services:', error)
    throw error
  }
}

