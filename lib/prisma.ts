import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Résoudre le chemin de la base de données de manière absolue pour éviter les problèmes de chemin relatif
function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    // Si pas de DATABASE_URL, utiliser le chemin par défaut
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
    return `file:${dbPath}`
  }
  
  // Si c'est un chemin relatif (commence par file:./), le convertir en absolu
  if (dbUrl.startsWith('file:./')) {
    const relativePath = dbUrl.replace('file:./', '')
    const absolutePath = path.join(process.cwd(), relativePath)
    return `file:${absolutePath}`
  }
  
  return dbUrl
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Configuration pour SQLite avec gestion des verrous
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Fonction helper pour retry en cas d'erreur de verrouillage SQLite
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      // Si c'est une erreur de verrouillage SQLite (code 14 ou 5)
      if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED' || 
          (error.message && (error.message.includes('Unable to open the database file') || 
                            error.message.includes('database is locked')))) {
        if (i < maxRetries - 1) {
          console.warn(`⚠️ Erreur de verrouillage SQLite, retry ${i + 1}/${maxRetries}...`)
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
          continue
        }
      }
      throw error
    }
  }
  
  throw lastError || new Error('Erreur inconnue')
}

