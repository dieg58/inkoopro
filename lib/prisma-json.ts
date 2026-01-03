/**
 * Utilitaires pour gérer les champs JSON avec Prisma
 * Compatible avec SQLite (string) et PostgreSQL (Json)
 */

import { Prisma } from '@prisma/client'

/**
 * Détecte si on utilise SQLite ou PostgreSQL
 */
export function isSQLite(): boolean {
  const dbUrl = process.env.DATABASE_URL || ''
  return dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:')
}

/**
 * Convertit une valeur pour l'insertion/mise à jour dans Prisma
 * - SQLite: sérialise en string JSON
 * - PostgreSQL: retourne l'objet directement ou Prisma.JsonNull pour null
 */
export function toPrismaJson(value: any): any {
  if (value === null || value === undefined) {
    if (isSQLite()) {
      return null
    } else {
      // PostgreSQL: utiliser Prisma.JsonNull pour les valeurs null
      return Prisma.JsonNull
    }
  }
  
  if (isSQLite()) {
    // SQLite: sérialiser en string
    return JSON.stringify(value)
  } else {
    // PostgreSQL: retourner l'objet directement (Prisma gère le type Json)
    return value
  }
}

/**
 * Convertit une valeur depuis Prisma
 * - SQLite: désérialise depuis string JSON
 * - PostgreSQL: retourne l'objet directement
 */
export function fromPrismaJson(value: any): any {
  if (value === null || value === undefined) {
    return null
  }
  
  if (typeof value === 'string') {
    // SQLite: désérialiser depuis string
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  } else {
    // PostgreSQL: retourner l'objet directement
    return value
  }
}

