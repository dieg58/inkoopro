/**
 * Calcul de la distance entre deux adresses
 * 
 * Méthodes disponibles :
 * 1. Google Distance Matrix API (recommandé, plus précis, nécessite une clé API)
 * 2. OpenStreetMap Nominatim + Haversine (gratuit, sans clé API, distance à vol d'oiseau)
 */

const WAREHOUSE_ADDRESS = {
  street: '3 Rue de la maîtrise',
  city: 'Nivelles',
  postalCode: '1400',
  country: 'BE',
}

const COUNTRIES: Record<string, string> = {
  'BE': 'Belgique',
  'FR': 'France',
  'GB': 'UK',
  'ES': 'Espagne',
  'NL': 'Pays-Bas',
  'DE': 'Allemagne',
  'CH': 'Suisse',
  'LU': 'Luxembourg',
}

/**
 * Formate une adresse pour la recherche géographique
 */
function formatAddress(address: {
  street: string
  city: string
  postalCode: string
  country: string
}): string {
  // Convertir le nom de pays en code ISO si nécessaire
  const countryCode = getCountryCode(address.country)
  return `${address.street}, ${address.postalCode} ${address.city}, ${countryCode}`.trim()
}

/**
 * Convertit un nom de pays en code ISO
 */
function getCountryCode(country: string): string {
  // Si c'est déjà un code (2 lettres), le retourner
  if (country.length === 2 && /^[A-Z]{2}$/.test(country.toUpperCase())) {
    return country.toUpperCase()
  }
  
  // Chercher dans notre liste
  const code = Object.keys(COUNTRIES).find(
    code => COUNTRIES[code].toLowerCase() === country.toLowerCase()
  )
  return code || country.toUpperCase()
}

/**
 * Calcule la distance avec Google Distance Matrix API (recommandé)
 * Retourne la distance en kilomètres selon l'itinéraire routier
 */
async function calculateDistanceWithGoogle(
  deliveryAddress: { street: string; city: string; postalCode: string; country: string }
): Promise<{ distance: number; error?: string }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  
  if (!apiKey) {
    return { distance: 0, error: 'Google Maps API key not configured' }
  }
  
  try {
    const origin = formatAddress(WAREHOUSE_ADDRESS)
    const destination = formatAddress(deliveryAddress)
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=metric&key=${apiKey}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      return { distance: 0, error: 'Erreur lors de l\'appel à Google Distance Matrix API' }
    }
    
    const data = await response.json()
    
    if (data.status === 'OK' && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
      const element = data.rows[0].elements[0]
      
      if (element.status === 'OK' && element.distance) {
        // La distance est en mètres, convertir en kilomètres
        const distanceKm = element.distance.value / 1000
        return { distance: Math.round(distanceKm * 10) / 10 } // Arrondir à 1 décimale
      } else {
        return { distance: 0, error: 'Impossible de calculer la distance avec Google Maps' }
      }
    }
    
    return { distance: 0, error: 'Réponse invalide de Google Distance Matrix API' }
  } catch (error) {
    console.error('Erreur Google Distance Matrix API:', error)
    return { distance: 0, error: 'Erreur lors du calcul avec Google Maps' }
  }
}

/**
 * Géocode une adresse (convertit une adresse en coordonnées GPS)
 * Utilise OpenStreetMap Nominatim (gratuit, sans clé API requise)
 */
async function geocodeAddress(address: {
  street: string
  city: string
  postalCode: string
  country: string
}): Promise<{ lat: number; lon: number } | null> {
  try {
    const formattedAddress = formatAddress(address)
    
    // Utiliser Nominatim (OpenStreetMap) - gratuit, sans clé API
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formattedAddress)}&limit=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'INKOO-PRO/1.0', // Requis par Nominatim
      },
    })
    
    if (!response.ok) {
      console.error('Erreur géocodage:', response.status, response.statusText)
      return null
    }
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      }
    }
    
    return null
  } catch (error) {
    console.error('Erreur lors du géocodage:', error)
    return null
  }
}

/**
 * Calcule la distance en kilomètres entre deux points GPS (formule de Haversine)
 * Cette formule calcule la distance à vol d'oiseau (distance directe)
 */
function calculateDistanceHaversine(
  point1: { lat: number; lon: number },
  point2: { lat: number; lon: number }
): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = toRadians(point2.lat - point1.lat)
  const dLon = toRadians(point2.lon - point1.lon)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance en kilomètres
  
  return Math.round(distance * 10) / 10 // Arrondir à 1 décimale
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calcule la distance avec OpenStreetMap (fallback gratuit)
 * Utilise la formule de Haversine (distance à vol d'oiseau)
 */
async function calculateDistanceWithOSM(
  deliveryAddress: { street: string; city: string; postalCode: string; country: string }
): Promise<{ distance: number; error?: string }> {
  try {
    // Géocoder les deux adresses
    const [warehouseCoords, deliveryCoords] = await Promise.all([
      geocodeAddress(WAREHOUSE_ADDRESS),
      geocodeAddress(deliveryAddress),
    ])
    
    if (!warehouseCoords) {
      return { distance: 0, error: 'Impossible de géocoder l\'adresse de l\'entrepôt' }
    }
    
    if (!deliveryCoords) {
      return { distance: 0, error: 'Impossible de géocoder l\'adresse de livraison' }
    }
    
    // Calculer la distance (formule de Haversine - distance à vol d'oiseau)
    const distance = calculateDistanceHaversine(warehouseCoords, deliveryCoords)
    
    return { distance }
  } catch (error) {
    console.error('Erreur calcul distance:', error)
    return { distance: 0, error: 'Erreur lors du calcul de la distance' }
  }
}

/**
 * Calcule la distance en km entre l'adresse de livraison et l'entrepôt
 * 
 * Essaie d'abord avec Google Distance Matrix API (si disponible)
 * Sinon, utilise OpenStreetMap + Haversine (gratuit, distance à vol d'oiseau)
 */
export async function calculateDistanceToWarehouse(deliveryAddress: {
  street: string
  city: string
  postalCode: string
  country: string
}): Promise<{ distance: number; error?: string }> {
  // Essayer d'abord avec Google Distance Matrix API (plus précis, distance routière)
  const googleResult = await calculateDistanceWithGoogle(deliveryAddress)
  
  if (!googleResult.error) {
    return googleResult
  }
  
  // Fallback sur OpenStreetMap (gratuit, distance à vol d'oiseau)
  console.log('Utilisation du fallback OpenStreetMap pour le calcul de distance')
  return await calculateDistanceWithOSM(deliveryAddress)
}

/**
 * Liste des pays disponibles
 */
export const AVAILABLE_COUNTRIES = COUNTRIES
