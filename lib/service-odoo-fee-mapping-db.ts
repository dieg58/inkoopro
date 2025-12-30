import { prisma, withRetry } from './prisma'

export type FeeMappingType = 'fixedFee' | 'option'

export interface ServiceOdooFeeMapping {
  id?: string
  mappingType: FeeMappingType
  technique: 'serigraphie' | 'broderie' | 'dtf'
  feeType?: string // Pour fixedFee: 'colorFee' (sérigraphie), 'smallDigitization' | 'largeDigitization' (broderie)
  optionId?: string // Pour option: l'ID de l'option (ex: 'discharge', 'gold', 'phospho')
  odooProductName: string // Nom du produit Odoo correspondant
}

/**
 * Charge tous les mappings de frais fixes et options
 */
export async function loadServiceOdooFeeMappings(): Promise<ServiceOdooFeeMapping[]> {
  try {
    // Vérifier que le modèle existe dans le client Prisma
    if (!prisma.serviceOdooFeeMapping) {
      console.error('❌ Le modèle serviceOdooFeeMapping n\'existe pas dans le client Prisma. Veuillez exécuter: npx prisma generate')
      return []
    }

    const mappings = await withRetry(async () => {
      return await prisma.serviceOdooFeeMapping.findMany({
        orderBy: [
          { technique: 'asc' },
          { mappingType: 'asc' },
          { feeType: 'asc' },
          { optionId: 'asc' },
        ],
      })
    })
    
    return mappings.map((m: any) => ({
      id: m.id,
      mappingType: m.mappingType as FeeMappingType,
      technique: m.technique as 'serigraphie' | 'broderie' | 'dtf',
      feeType: m.feeType || undefined,
      optionId: m.optionId || undefined,
      odooProductName: m.odooProductName,
    }))
  } catch (error) {
    console.error('Erreur lors du chargement des mappings de frais fixes/options:', error)
    return []
  }
}

/**
 * Sauvegarde un mapping de frais fixe ou option
 */
export async function saveServiceOdooFeeMapping(mapping: ServiceOdooFeeMapping): Promise<void> {
  try {
    // Vérifier que le modèle existe dans le client Prisma
    if (!prisma.serviceOdooFeeMapping) {
      throw new Error('Le modèle serviceOdooFeeMapping n\'existe pas dans le client Prisma. Veuillez exécuter: npx prisma generate')
    }

    await withRetry(async () => {
      // Construire la condition de recherche avec une approche qui gère mieux null
      // Pour SQLite, on utilise une condition qui recherche explicitement null ou la valeur
      const whereCondition: any = {
        mappingType: mapping.mappingType,
        technique: mapping.technique,
      }

      // Gérer feeType : soit la valeur spécifiée, soit null explicitement
      if (mapping.feeType !== undefined && mapping.feeType !== null && mapping.feeType !== '') {
        whereCondition.feeType = mapping.feeType
      } else {
        whereCondition.feeType = null
      }

      // Gérer optionId : soit la valeur spécifiée, soit null explicitement
      if (mapping.optionId !== undefined && mapping.optionId !== null && mapping.optionId !== '') {
        whereCondition.optionId = mapping.optionId
      } else {
        whereCondition.optionId = null
      }

      console.log('🔍 Recherche mapping existant avec condition:', JSON.stringify(whereCondition, null, 2))

      // Utiliser findMany puis filtrer pour éviter les problèmes avec null dans findFirst
      const allMappings = await prisma.serviceOdooFeeMapping.findMany({
        where: {
          mappingType: mapping.mappingType,
          technique: mapping.technique,
        },
      })

      // Filtrer manuellement pour gérer les nulls correctement
      const existing = allMappings.find(m => {
        const feeTypeMatch = (m.feeType === null && (mapping.feeType === null || mapping.feeType === undefined || mapping.feeType === '')) ||
                            (m.feeType === mapping.feeType)
        const optionIdMatch = (m.optionId === null && (mapping.optionId === null || mapping.optionId === undefined || mapping.optionId === '')) ||
                             (m.optionId === mapping.optionId)
        return feeTypeMatch && optionIdMatch
      })

      const dataToSave = {
        mappingType: mapping.mappingType,
        technique: mapping.technique,
        feeType: (mapping.feeType && mapping.feeType !== '') ? mapping.feeType : null,
        optionId: (mapping.optionId && mapping.optionId !== '') ? mapping.optionId : null,
        odooProductName: mapping.odooProductName,
      }

      if (existing) {
        console.log('📝 Mise à jour mapping existant:', existing.id)
        await prisma.serviceOdooFeeMapping.update({
          where: { id: existing.id },
          data: {
            odooProductName: mapping.odooProductName,
          },
        })
      } else {
        console.log('➕ Création nouveau mapping')
        await prisma.serviceOdooFeeMapping.create({
          data: dataToSave,
        })
      }
    })
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde du mapping de frais fixe/option:', error)
    console.error('📦 Données du mapping:', JSON.stringify(mapping, null, 2))
    if (error instanceof Error) {
      console.error('📋 Message d\'erreur:', error.message)
      console.error('📋 Stack:', error.stack)
    }
    throw error
  }
}

/**
 * Sauvegarde plusieurs mappings
 */
export async function saveServiceOdooFeeMappings(mappings: ServiceOdooFeeMapping[]): Promise<void> {
  console.log(`💾 Sauvegarde de ${mappings.length} mapping(s) de frais/options`)
  
  // Filtrer et nettoyer les mappings avant sauvegarde
  const validMappings = mappings
    .filter(m => {
      // Ne garder que les mappings avec un nom de produit Odoo valide
      const isValid = m.odooProductName && m.odooProductName.trim() !== ''
      if (!isValid) {
        console.warn('⚠️ Mapping ignoré (nom produit Odoo manquant):', m)
      }
      return isValid
    })
    .map((m: any) => ({
      ...m,
      // S'assurer que les champs optionnels sont undefined (seront convertis en null dans saveServiceOdooFeeMapping)
      feeType: m.feeType || undefined,
      optionId: m.optionId || undefined,
    }))
  
  console.log(`✅ ${validMappings.length} mapping(s) valide(s) à sauvegarder`)
  
  for (const mapping of validMappings) {
    await saveServiceOdooFeeMapping(mapping)
  }
  
  console.log('✅ Tous les mappings de frais/options sauvegardés avec succès')
}

/**
 * Supprime un mapping
 */
export async function deleteServiceOdooFeeMapping(id: string): Promise<void> {
  try {
    await withRetry(async () => {
      await prisma.serviceOdooFeeMapping.delete({
        where: { id },
      })
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du mapping:', error)
    throw error
  }
}

/**
 * Obtient le nom du produit Odoo pour un frais fixe
 */
export async function getOdooProductNameForFixedFee(
  technique: string,
  feeType: string
): Promise<string | null> {
  try {
    const mappings = await loadServiceOdooFeeMappings()
    const mapping = mappings.find(
      m => m.mappingType === 'fixedFee' && m.technique === technique && m.feeType === feeType
    )
    return mapping?.odooProductName || null
  } catch (error) {
    console.error('Erreur lors de la récupération du produit Odoo pour frais fixe:', error)
    return null
  }
}

/**
 * Obtient le nom du produit Odoo pour une option
 */
export async function getOdooProductNameForOption(
  technique: string,
  optionId: string
): Promise<string | null> {
  try {
    const mappings = await loadServiceOdooFeeMappings()
    const mapping = mappings.find(
      m => m.mappingType === 'option' && m.technique === technique && m.optionId === optionId
    )
    return mapping?.odooProductName || null
  } catch (error) {
    console.error('Erreur lors de la récupération du produit Odoo pour option:', error)
    return null
  }
}

