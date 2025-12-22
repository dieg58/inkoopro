import { prisma, withRetry } from './prisma'

export interface ServiceOdooMapping {
  technique: 'serigraphie' | 'broderie' | 'dtf'
  odooProductName: string
  textileType?: 'clair' | 'fonce' // Uniquement pour sérigraphie
}

/**
 * Charge le mapping des services vers les produits Odoo
 */
export async function loadServiceOdooMapping(): Promise<ServiceOdooMapping[]> {
  try {
    const mappings = await prisma.serviceOdooMapping.findMany()
    const result = mappings.map(m => ({
      technique: m.technique as 'serigraphie' | 'broderie' | 'dtf',
      odooProductName: m.odooProductName,
      textileType: m.textileType as 'clair' | 'fonce' | undefined,
    }))
    
    // Si aucun mapping, initialiser avec les valeurs par défaut
    if (result.length === 0) {
      console.log('📝 Aucun mapping trouvé, initialisation avec les valeurs par défaut...')
      await initializeDefaultMappings()
      // Recharger après initialisation
      const newMappings = await prisma.serviceOdooMapping.findMany()
      return newMappings.map(m => ({
        technique: m.technique as 'serigraphie' | 'broderie' | 'dtf',
        odooProductName: m.odooProductName,
        textileType: m.textileType as 'clair' | 'fonce' | undefined,
      }))
    }
    
    return result
  } catch (error) {
    console.error('Erreur lors du chargement du mapping services Odoo:', error)
    return []
  }
}

/**
 * Sauvegarde le mapping des services vers les produits Odoo
 */
export async function saveServiceOdooMapping(mapping: ServiceOdooMapping): Promise<void> {
  try {
    await withRetry(async () => {
      // Pour les clés uniques composites avec champs nullable, on doit utiliser findFirst + create/update
      const existing = await prisma.serviceOdooMapping.findFirst({
        where: {
          technique: mapping.technique,
          textileType: mapping.textileType ?? null,
        },
      })

      if (existing) {
        await prisma.serviceOdooMapping.update({
          where: { id: existing.id },
          data: {
            odooProductName: mapping.odooProductName,
            textileType: mapping.textileType ?? null,
          },
        })
      } else {
        await prisma.serviceOdooMapping.create({
          data: {
            technique: mapping.technique,
            odooProductName: mapping.odooProductName,
            textileType: mapping.textileType ?? null,
          },
        })
      }
    })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du mapping services Odoo:', error)
    throw error
  }
}

/**
 * Obtient le nom du produit Odoo pour une technique donnée
 */
export async function getOdooProductNameForTechnique(
  technique: string,
  techniqueOptions?: any
): Promise<string | null> {
  try {
    const mappings = await loadServiceOdooMapping()
    console.log(`📋 Mappings disponibles:`, mappings.map(m => ({
      technique: m.technique,
      textileType: m.textileType,
      odooProductName: m.odooProductName
    })))
    
    if (technique === 'serigraphie') {
      // Pour sérigraphie, on cherche selon textileType
      const textileType = techniqueOptions?.textileType || 'clair'
      console.log(`   🔍 Recherche mapping sérigraphie avec textileType="${textileType}"`)
      const mapping = mappings.find(
        m => m.technique === 'serigraphie' && m.textileType === textileType
      )
      if (mapping) {
        console.log(`   ✅ Mapping trouvé: "${mapping.odooProductName}"`)
      } else {
        console.warn(`   ⚠️ Aucun mapping trouvé pour sérigraphie textileType="${textileType}"`)
        console.warn(`   → Mappings disponibles:`, mappings.filter(m => m.technique === 'serigraphie'))
      }
      return mapping?.odooProductName || null
    } else {
      // Pour broderie et dtf, on cherche directement
      console.log(`   🔍 Recherche mapping pour technique="${technique}"`)
      const mapping = mappings.find(m => m.technique === technique)
      if (mapping) {
        console.log(`   ✅ Mapping trouvé: "${mapping.odooProductName}"`)
      } else {
        console.warn(`   ⚠️ Aucun mapping trouvé pour technique="${technique}"`)
      }
      return mapping?.odooProductName || null
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du nom produit Odoo:', error)
    return null
  }
}

/**
 * Initialise les mappings par défaut si la table est vide
 */
export async function initializeDefaultMappings(): Promise<void> {
  try {
    await withRetry(async () => {
      const existing = await prisma.serviceOdooMapping.count()
      if (existing === 0) {
        // Créer les mappings par défaut un par un pour éviter les doublons
        const defaultMappings = [
          { technique: 'serigraphie', odooProductName: 'SERIGRAPHIECLAIR', textileType: 'clair' as const },
          { technique: 'serigraphie', odooProductName: 'SERIGRAPHIEFONCE', textileType: 'fonce' as const },
          { technique: 'broderie', odooProductName: 'BRODERIE', textileType: null },
          { technique: 'dtf', odooProductName: 'DTFTEXTILE', textileType: null },
        ]
        
        for (const mapping of defaultMappings) {
          try {
            await prisma.serviceOdooMapping.create({
              data: mapping,
            })
          } catch (error: any) {
            // Ignorer les erreurs de doublons
            if (error.code !== 'P2002') {
              throw error
            }
          }
        }
        console.log('✅ Mappings par défaut créés')
      }
    })
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des mappings par défaut:', error)
  }
}

