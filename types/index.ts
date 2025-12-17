// Types pour les produits
export type ProductSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL' | 'Taille unique'
export type ProductColor = string

export type ProductCategory = 'tshirt' | 'polo' | 'sweat' | 'casquette' | 'autre'

export interface Product {
  id: string
  name: string
  description?: string
  image?: string
  category?: ProductCategory
  availableSizes: ProductSize[]
  availableColors: ProductColor[]
  basePrice?: number
  variantPrices?: Record<string, number> // Prix par combinaison couleur-taille (ex: "Rouge-S": 15.99)
}

// Types pour les techniques
export type TechniqueType = 'serigraphie' | 'broderie' | 'dtf'

export interface Technique {
  id: TechniqueType
  name: string
  description?: string
}

// Options spécifiques par technique
export type TextileType = 'clair' | 'fonce'

export interface SerigraphieOptions {
  textileType: TextileType // Impression sur textile clair ou foncé
  nombreCouleurs: number
  dimension: string // Dimension du marquage (ex: "10x10cm", "15x20cm", etc.)
  nombreEmplacements: number
}

export interface BroderieOptions {
  nombrePoints: number
  nombreEmplacements: number
}

export interface DTFOptions {
  dimension: string // Dimension du marquage
  nombreEmplacements: number
}

export type TechniqueOptions = SerigraphieOptions | BroderieOptions | DTFOptions

// Configuration des prix des services
export interface QuantityRange {
  min: number
  max: number | null // null = infini
  label: string // Ex: "1-10", "11-50", "51-100", "101+"
}

// Prix pour la sérigraphie (tableau croisé: quantité × nombre de couleurs)
export interface SerigraphiePricing {
  technique: 'serigraphie'
  minQuantity: number // Quantité minimum
  quantityRanges: QuantityRange[]
  colorCounts: number[] // Ex: [1, 2, 3, 4, 5, 6]
  prices: Record<string, number> // Clé: "quantityRange-colorCount" (ex: "1-10-2" pour 1-10 pièces, 2 couleurs)
  fixedFeePerColor: number // Frais fixes par couleur (ex: 25€)
}

// Prix pour la broderie (tableau croisé: quantité × nombre de points)
export interface BroderiePricing {
  technique: 'broderie'
  minQuantity: number
  quantityRanges: QuantityRange[]
  pointRanges: Array<{ min: number; max: number | null; label: string }> // Ex: "0-5000", "5001-10000", etc.
  prices: Record<string, number> // Clé: "quantityRange-pointRange" (ex: "1-10-0-5000")
  fixedFeeSmallDigitization: number // Frais fixes pour petite digitalisation (ex: 40€)
  fixedFeeLargeDigitization: number // Frais fixes pour grande digitalisation (ex: 60€)
  smallDigitizationThreshold: number // Seuil pour petite vs grande digitalisation (ex: 10000 points)
}

// Prix pour la DTF (tableau croisé: quantité × dimension)
export interface DTFPricing {
  technique: 'dtf'
  minQuantity: number
  quantityRanges: QuantityRange[]
  dimensions: string[] // Ex: ["10x10 cm", "15x15 cm", "20x20 cm", "Personnalisé"]
  prices: Record<string, number> // Clé: "quantityRange-dimension" (ex: "1-10-10x10 cm")
}

export type ServicePricing = SerigraphiePricing | BroderiePricing | DTFPricing

// Position du marquage
export type PositionType = 
  | 'poitrine-gauche'
  | 'poitrine-droite'
  | 'poitrine-centre'
  | 'dos-centre'
  | 'dos-haut'
  | 'manche-gauche'
  | 'manche-droite'
  | 'epaule-gauche'
  | 'epaule-droite'
  | 'devant-centre'
  | 'devant-haut'
  | 'couronne'
  | 'cote-gauche'
  | 'cote-droite'
  | 'custom'

export interface Position {
  type: PositionType
  customDescription?: string
}

export interface MarkingFile {
  id: string
  name: string
  url: string
  size: number
  type: string
}

// Configuration des positions disponibles par catégorie de produit
export interface PositionConfig {
  [key: string]: PositionType[] // key = ProductCategory
}

// Quantité par taille et couleur
export interface SizeQuantity {
  size: ProductSize
  quantity: number
}

export interface ColorQuantities {
  color: ProductColor
  quantities: SizeQuantity[]
}

// Article de devis
export interface QuoteItem {
  id: string
  product: Product
  clientProvided: boolean // Le client fournit-il le produit ?
  colorQuantities: ColorQuantities[]
  technique: TechniqueType
  techniqueOptions: TechniqueOptions
  position: Position | null
  files?: Array<{ id: string; name: string; url: string; size: number; type: string }>
  notes?: string
  totalQuantity: number
}

// Produit sélectionné avant personnalisation
export interface SelectedProduct {
  id: string
  product: Product
  clientProvided: boolean
  colorQuantities: ColorQuantities[]
}

// Livraison
export type DeliveryType = 'livraison' | 'pickup'

export interface Delivery {
  type: DeliveryType
  address?: {
    street: string
    city: string
    postalCode: string
    country: string
  }
  billingAddressDifferent?: boolean // Si l'adresse de facturation est différente
  billingAddress?: {
    street: string
    city: string
    postalCode: string
    country: string
  }
}

// Délai
export type DelayOption = 'standard' | 'express'

export interface Delay {
  type: DelayOption
  workingDays: number // Jours ouvrables (par défaut 10)
  isExpress?: boolean // Si true, délai express (soumis à approbation)
  expressDays?: number // Nombre de jours pour l'express (peut être < 1 pour 24h)
}

// Commande complète
export interface Quote {
  id?: string
  clientInfo?: {
    name: string
    email: string
    company?: string
    phone?: string
  }
  items: QuoteItem[]
  delivery: Delivery
  delay: Delay
  createdAt?: Date
  status?: 'draft' | 'sent' | 'validated' | 'rejected'
}

// Configuration des options par technique
export interface TechniqueConfig {
  serigraphie: {
    minCouleurs: number
    maxCouleurs: number
    minEmplacements: number
    maxEmplacements: number
  }
  broderie: {
    minPoints: number
    maxPoints: number
    minEmplacements: number
    maxEmplacements: number
  }
  dtf: {
    minEmplacements: number
    maxEmplacements: number
    finitions: string[]
  }
}

