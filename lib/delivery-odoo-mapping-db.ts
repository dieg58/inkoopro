import { prisma, withRetry } from './prisma'

export interface DeliveryOdooMapping {
  deliveryType: 'pickup' | 'dpd' | 'client_carrier' | 'courier'
  odooProductCode: string // Référence interne (default_code) du produit Odoo
}

/**
 * Charge le mapping des méthodes de livraison vers les codes produits Odoo
 */
export async function loadDeliveryOdooMapping(): Promise<DeliveryOdooMapping[]> {
  try {
    const mappings = await (prisma as any).deliveryOdooMapping.findMany()
    const result = mappings.map((m: any) => ({
      deliveryType: m.deliveryType as 'pickup' | 'dpd' | 'client_carrier' | 'courier',
      odooProductCode: m.odooProductCode,
    }))
    
    // Si aucun mapping, initialiser avec les valeurs par défaut
    if (result.length === 0) {
      console.log('📝 Aucun mapping de livraison trouvé, initialisation avec les valeurs par défaut...')
      await initializeDefaultDeliveryMappings()
      // Recharger après initialisation
      const newMappings = await (prisma as any).deliveryOdooMapping.findMany()
      return newMappings.map((m: any) => ({
        deliveryType: m.deliveryType as 'pickup' | 'dpd' | 'client_carrier' | 'courier',
        odooProductCode: m.odooProductCode,
      }))
    }
    
    return result
  } catch (error) {
    console.error('Erreur lors du chargement du mapping livraison Odoo:', error)
    return []
  }
}

/**
 * Sauvegarde le mapping des méthodes de livraison vers les codes produits Odoo
 */
export async function saveDeliveryOdooMapping(mapping: DeliveryOdooMapping): Promise<void> {
  try {
    await withRetry(async () => {
      // Utiliser (prisma as any) car le Prisma Client peut ne pas avoir été régénéré
      const existing = await (prisma as any).deliveryOdooMapping.findUnique({
        where: { deliveryType: mapping.deliveryType },
      })

      if (existing) {
        await (prisma as any).deliveryOdooMapping.update({
          where: { deliveryType: mapping.deliveryType },
          data: {
            odooProductCode: mapping.odooProductCode,
          },
        })
      } else {
        await (prisma as any).deliveryOdooMapping.create({
          data: {
            deliveryType: mapping.deliveryType,
            odooProductCode: mapping.odooProductCode,
          },
        })
      }
    })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du mapping livraison Odoo:', error)
    throw error
  }
}

/**
 * Obtient le code produit Odoo (default_code) pour une méthode de livraison donnée
 */
export async function getOdooProductCodeForDelivery(
  deliveryType: string
): Promise<string | null> {
  try {
    const mappings = await loadDeliveryOdooMapping()
    const mapping = mappings.find(m => m.deliveryType === deliveryType)
    return mapping?.odooProductCode || null
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du code produit Odoo pour livraison:', error)
    return null
  }
}

/**
 * Initialise les mappings par défaut si la table est vide
 */
export async function initializeDefaultDeliveryMappings(): Promise<void> {
  try {
    await withRetry(async () => {
      const existing = await (prisma as any).deliveryOdooMapping.count()
      if (existing === 0) {
        // Créer les mappings par défaut
        const defaultMappings = [
          { deliveryType: 'pickup', odooProductCode: 'PICKUP' },
          { deliveryType: 'dpd', odooProductCode: 'DPD' },
          { deliveryType: 'client_carrier', odooProductCode: 'DELIVERYCLIENT' },
          { deliveryType: 'courier', odooProductCode: 'COURSIER' },
        ]
        
        for (const mapping of defaultMappings) {
          try {
            await (prisma as any).deliveryOdooMapping.create({
              data: mapping,
            })
          } catch (error: any) {
            // Ignorer les erreurs de doublons
            if (error.code !== 'P2002') {
              throw error
            }
          }
        }
        console.log('✅ Mappings de livraison par défaut créés')
      }
    })
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des mappings de livraison par défaut:', error)
  }
}

