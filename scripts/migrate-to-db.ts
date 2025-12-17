/**
 * Script de migration des données existantes vers la base de données
 * 
 * Usage: npx tsx scripts/migrate-to-db.ts
 */

import { prisma } from '../lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'
import { defaultPricing } from '../lib/service-pricing'

async function migrateServicePricing() {
  try {
    const filePath = path.join(process.cwd(), '.cache', 'service-pricing.json')
    const data = await fs.readFile(filePath, 'utf-8')
    const pricing = JSON.parse(data)
    
    // Supprimer les configurations existantes
    await prisma.servicePricing.deleteMany()
    
    // Insérer les nouvelles configurations
    await prisma.servicePricing.createMany({
      data: pricing.map((p: any) => ({
        technique: p.technique,
        minQuantity: p.minQuantity,
        quantityRanges: JSON.stringify(p.quantityRanges),
        colorCounts: p.colorCounts ? JSON.stringify(p.colorCounts) : null,
        pointRanges: p.pointRanges ? JSON.stringify(p.pointRanges) : null,
        dimensions: p.dimensions ? JSON.stringify(p.dimensions) : null,
        prices: JSON.stringify(p.prices),
        fixedFeePerColor: p.fixedFeePerColor || null,
        fixedFeeSmallDigitization: p.fixedFeeSmallDigitization || null,
        fixedFeeLargeDigitization: p.fixedFeeLargeDigitization || null,
        smallDigitizationThreshold: p.smallDigitizationThreshold || null,
      })),
    })
    
    console.log('✅ Prix des services migrés avec succès')
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  Fichier service-pricing.json non trouvé, utilisation des valeurs par défaut')
      // Initialiser avec les valeurs par défaut
      await prisma.servicePricing.deleteMany()
      await prisma.servicePricing.createMany({
        data: defaultPricing.map((p: any) => ({
          technique: p.technique,
          minQuantity: p.minQuantity,
          quantityRanges: JSON.stringify(p.quantityRanges),
          colorCounts: p.colorCounts ? JSON.stringify(p.colorCounts) : null,
          pointRanges: p.pointRanges ? JSON.stringify(p.pointRanges) : null,
          dimensions: p.dimensions ? JSON.stringify(p.dimensions) : null,
          prices: JSON.stringify(p.prices),
          fixedFeePerColor: p.fixedFeePerColor || null,
          fixedFeeSmallDigitization: p.fixedFeeSmallDigitization || null,
          fixedFeeLargeDigitization: p.fixedFeeLargeDigitization || null,
          smallDigitizationThreshold: p.smallDigitizationThreshold || null,
        })),
      })
      console.log('✅ Prix des services initialisés avec les valeurs par défaut')
    } else {
      console.error('❌ Erreur lors de la migration des prix des services:', error)
    }
  }
}

async function migratePricingConfig() {
  try {
    const filePath = path.join(process.cwd(), '.cache', 'pricing-config.json')
    const data = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(data)
    
    await prisma.pricingConfig.upsert({
      where: { id: 'singleton' },
      update: {
        textileDiscountPercentage: config.textileDiscountPercentage || 30,
        clientProvidedIndexation: config.clientProvidedIndexation || 10,
        expressSurchargePercent: config.expressSurchargePercent || 10,
      },
      create: {
        id: 'singleton',
        textileDiscountPercentage: config.textileDiscountPercentage || 30,
        clientProvidedIndexation: config.clientProvidedIndexation || 10,
        expressSurchargePercent: config.expressSurchargePercent || 10,
      },
    })
    
    console.log('✅ Configuration des prix migrée avec succès')
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  Fichier pricing-config.json non trouvé, utilisation des valeurs par défaut')
      await prisma.pricingConfig.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
          id: 'singleton',
          textileDiscountPercentage: 30,
          clientProvidedIndexation: 10,
          expressSurchargePercent: 10,
        },
      })
      console.log('✅ Configuration des prix initialisée avec les valeurs par défaut')
    } else {
      console.error('❌ Erreur lors de la migration de la configuration des prix:', error)
    }
  }
}

async function main() {
  console.log('🚀 Début de la migration vers la base de données...\n')
  
  await migrateServicePricing()
  await migratePricingConfig()
  
  console.log('\n✅ Migration terminée avec succès!')
}

main()
  .catch((error) => {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

