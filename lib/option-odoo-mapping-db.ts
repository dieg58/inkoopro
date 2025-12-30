import { prisma, withRetry } from './prisma'

export interface OptionOdooMapping {
  optionType: 'individualPackaging' | 'newCarton' | 'vectorization'
  odooProductCode: string // Référence interne (default_code) du produit Odoo
}

/**
 * Charge le mapping des options vers les codes produits Odoo
 */
export async function loadOptionOdooMapping(): Promise<OptionOdooMapping[]> {
  try {
    const mappings = await (prisma as any).optionOdooMapping.findMany()
    const result = mappings.map((m: any) => ({
      optionType: m.optionType as 'individualPackaging' | 'newCarton' | 'vectorization',
      odooProductCode: m.odooProductCode,
    }))
    
    // Si aucun mapping, initialiser avec les valeurs par défaut
    if (result.length === 0) {
      console.log('📝 Aucun mapping d\'option trouvé, initialisation avec les valeurs par défaut...')
      await initializeDefaultOptionMappings()
      // Recharger après initialisation
      const newMappings = await (prisma as any).optionOdooMapping.findMany()
      return newMappings.map((m: any) => ({
        optionType: m.optionType as 'individualPackaging' | 'newCarton' | 'vectorization',
        odooProductCode: m.odooProductCode,
      }))
    }
    
    return result
  } catch (error) {
    console.error('Erreur lors du chargement du mapping option Odoo:', error)
    return []
  }
}

/**
 * Sauvegarde le mapping des options vers les codes produits Odoo
 */
export async function saveOptionOdooMapping(mapping: OptionOdooMapping): Promise<void> {
  try {
    await withRetry(async () => {
      // Utiliser (prisma as any) car le Prisma Client peut ne pas avoir été régénéré
      const existing = await (prisma as any).optionOdooMapping.findUnique({
        where: { optionType: mapping.optionType },
      })

      if (existing) {
        await (prisma as any).optionOdooMapping.update({
          where: { optionType: mapping.optionType },
          data: {
            odooProductCode: mapping.odooProductCode,
          },
        })
      } else {
        await (prisma as any).optionOdooMapping.create({
          data: {
            optionType: mapping.optionType,
            odooProductCode: mapping.odooProductCode,
          },
        })
      }
    })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du mapping option Odoo:', error)
    throw error
  }
}

/**
 * Obtient le code produit Odoo (default_code) pour une option donnée
 */
export async function getOdooProductCodeForOption(
  optionType: 'individualPackaging' | 'newCarton' | 'vectorization'
): Promise<string | null> {
  try {
    const mappings = await loadOptionOdooMapping()
    const mapping = mappings.find(m => m.optionType === optionType)
    return mapping?.odooProductCode || null
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du code produit Odoo pour option:', error)
    return null
  }
}

/**
 * Initialise les mappings par défaut si la table est vide
 */
export async function initializeDefaultOptionMappings(): Promise<void> {
  try {
    await withRetry(async () => {
      const existing = await (prisma as any).optionOdooMapping.count()
      if (existing === 0) {
        // Créer les mappings par défaut
        const defaultMappings = [
          { optionType: 'individualPackaging', odooProductCode: 'EMBALLAGEINDIVIDUEL' },
          { optionType: 'newCarton', odooProductCode: 'CARTONNEUF' },
          { optionType: 'vectorization', odooProductCode: 'VECTORISATION' },
        ]
        
        for (const mapping of defaultMappings) {
          try {
            await (prisma as any).optionOdooMapping.create({
              data: mapping,
            })
          } catch (error: any) {
            // Ignorer les erreurs de doublons
            if (error.code !== 'P2002') {
              throw error
            }
          }
        }
        console.log('✅ Mappings d\'options par défaut créés')
      }
    })
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des mappings d\'options par défaut:', error)
  }
}

