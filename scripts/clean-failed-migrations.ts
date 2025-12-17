import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanFailedMigrations() {
  try {
    console.log('🧹 Nettoyage des migrations échouées...')
    
    // Supprimer les migrations échouées
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations" 
      WHERE "finished_at" IS NULL 
      AND "started_at" IS NOT NULL
    `)
    
    console.log(`✅ ${result} migration(s) échouée(s) supprimée(s)`)
    
    // Afficher l'état actuel
    const migrations = await prisma.$queryRawUnsafe<Array<{
      migration_name: string
      finished_at: Date | null
    }>>(`
      SELECT "migration_name", "finished_at" 
      FROM "_prisma_migrations" 
      ORDER BY "started_at" DESC 
      LIMIT 10
    `)
    
    console.log('\n📋 État des migrations :')
    migrations.forEach(m => {
      const status = m.finished_at ? '✅' : '❌'
      console.log(`  ${status} ${m.migration_name}`)
    })
    
  } catch (error: any) {
    // Si la table n'existe pas encore, c'est normal
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('ℹ️  La table _prisma_migrations n\'existe pas encore. C\'est normal pour une première migration.')
      return
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

cleanFailedMigrations()
  .then(() => {
    console.log('\n✅ Nettoyage terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })

