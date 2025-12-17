/**
 * Calculer les dates d'indication et de livraison
 */

/**
 * Vérifier si une date est un jour ouvrable (lundi-vendredi)
 */
function isWorkingDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6 // 0 = dimanche, 6 = samedi
}

/**
 * Ajouter des jours ouvrables à une date
 */
export function addWorkingDays(startDate: Date, workingDays: number): Date {
  const result = new Date(startDate)
  let daysAdded = 0
  
  while (daysAdded < workingDays) {
    result.setDate(result.getDate() + 1)
    if (isWorkingDay(result)) {
      daysAdded++
    }
  }
  
  return result
}

/**
 * Calculer la date d'indication (aujourd'hui)
 */
export function getIndicationDate(): Date {
  return new Date()
}

/**
 * Calculer la date de livraison selon le délai
 */
export function getDeliveryDate(delay: { workingDays: number; isExpress?: boolean; expressDays?: number }): Date {
  const startDate = getIndicationDate()
  
  if (delay.isExpress && delay.expressDays !== undefined) {
    // Pour l'express, on peut avoir moins d'un jour ouvrable (24h = 0.5 jour ouvrable)
    // On arrondit à 1 jour ouvrable minimum
    const expressWorkingDays = Math.max(1, Math.ceil(delay.expressDays))
    return addWorkingDays(startDate, expressWorkingDays)
  }
  
  return addWorkingDays(startDate, delay.workingDays)
}

/**
 * Formater une date en français
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Formater une date courte (pour affichage compact)
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Calculer le supplément express (10% par jour plus court)
 */
export function calculateExpressSurcharge(
  standardDays: number,
  expressDays: number
): number {
  const daysDifference = standardDays - expressDays
  if (daysDifference <= 0) return 0
  
  // 10% par jour plus court
  return daysDifference * 10
}

