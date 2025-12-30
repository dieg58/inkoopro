import { SelectedProduct, Delivery } from '@/types'

/**
 * Capacité d'un carton par type de produit
 */
const CARTON_CAPACITY = {
  tshirt: 80,    // 80 t-shirts par carton
  sweat: 30,     // 30 sweats par carton
  totebag: 200,  // 200 totebags par carton
  default: 80,   // Par défaut, considérer comme t-shirt
}

/**
 * Prix d'un carton
 */
const CARTON_PRICE = 13.65 // € HT

/**
 * Détermine le type de produit basé sur son nom ou sa catégorie
 */
function getProductType(productName: string, category?: string): 'tshirt' | 'sweat' | 'totebag' {
  const nameLower = productName.toLowerCase()
  
  // Vérifier d'abord la catégorie
  if (category === 'sweat') return 'sweat'
  if (category === 'tshirt' || category === 'polo') return 'tshirt'
  
  // Sinon, chercher dans le nom
  if (nameLower.includes('sweat') || nameLower.includes('hoodie') || nameLower.includes('pull')) {
    return 'sweat'
  }
  if (nameLower.includes('tote') || nameLower.includes('sac')) {
    return 'totebag'
  }
  
  // Par défaut, considérer comme t-shirt
  return 'tshirt'
}

/**
 * Calcule le nombre de cartons nécessaires pour les produits sélectionnés
 */
export function calculateCartons(selectedProducts: SelectedProduct[]): number {
  if (selectedProducts.length === 0) return 0
  
  // Grouper les quantités par type de produit
  const quantitiesByType: Record<'tshirt' | 'sweat' | 'totebag', number> = {
    tshirt: 0,
    sweat: 0,
    totebag: 0,
  }
  
  selectedProducts.forEach(selectedProduct => {
    const productType = getProductType(
      selectedProduct.product.name,
      selectedProduct.product.category
    )
    
    // Calculer la quantité totale pour ce produit
    const totalQuantity = selectedProduct.colorQuantities.reduce((total, cq) => {
      return total + cq.quantities.reduce((sum, q) => sum + q.quantity, 0)
    }, 0)
    
    quantitiesByType[productType] += totalQuantity
  })
  
  // Calculer le nombre de cartons pour chaque type
  const cartonsTshirt = Math.ceil(quantitiesByType.tshirt / CARTON_CAPACITY.tshirt)
  const cartonsSweat = Math.ceil(quantitiesByType.sweat / CARTON_CAPACITY.sweat)
  const cartonsTotebag = Math.ceil(quantitiesByType.totebag / CARTON_CAPACITY.totebag)
  
  // Le total est la somme des cartons de chaque type
  return cartonsTshirt + cartonsSweat + cartonsTotebag
}

/**
 * Calcule les frais de port en fonction du nombre de cartons
 * Pour le coursier, utilise la distance et les tarifs configurés
 */
export async function calculateShippingCost(
  selectedProducts: SelectedProduct[],
  delivery?: Delivery,
  pricingConfig?: {
    courierPricePerKm?: number
    courierMinimumFee?: number
  }
): Promise<number> {
  // Si c'est un coursier et qu'on a une adresse + config de prix
  if (delivery?.type === 'courier' && delivery.address && pricingConfig) {
    const { calculateDistanceToWarehouse } = await import('./distance')
    
    try {
      const result = await calculateDistanceToWarehouse(delivery.address)
      
      if (result.distance > 0 && !result.error) {
        const pricePerKm = pricingConfig.courierPricePerKm || 1.50
        const minimumFee = pricingConfig.courierMinimumFee || 15.00
        
        const calculatedPrice = result.distance * pricePerKm
        // Appliquer le forfait minimum
        return Math.max(calculatedPrice, minimumFee)
      }
    } catch (error) {
      console.error('Erreur calcul frais coursier:', error)
      // En cas d'erreur, retourner le forfait minimum
      return pricingConfig.courierMinimumFee || 15.00
    }
  }
  
  // Pour DPD et autres, calculer selon les cartons
  const cartons = calculateCartons(selectedProducts)
  return cartons * CARTON_PRICE
}

/**
 * Version synchrone (pour compatibilité avec le code existant)
 * Pour le coursier, retourne 0 car nécessite un calcul asynchrone
 */
export function calculateShippingCostSync(selectedProducts: SelectedProduct[]): number {
  const cartons = calculateCartons(selectedProducts)
  return cartons * CARTON_PRICE
}


