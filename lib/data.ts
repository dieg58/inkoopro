import { Product, Technique, TechniqueConfig, Delay, ProductCategory, PositionType, PositionConfig } from '@/types'

// Données de produits exemple
export const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'T-shirt Coton',
    description: 'T-shirt 100% coton',
    category: 'tshirt',
    availableSizes: ['S', 'M', 'L', 'XL', '2XL'],
    availableColors: ['Blanc', 'Noir', 'Bleu', 'Rouge', 'Gris'],
  },
  {
    id: '2',
    name: 'Polo',
    description: 'Polo en coton piqué',
    category: 'polo',
    availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: ['Blanc', 'Noir', 'Bleu marine', 'Rouge'],
  },
  {
    id: '3',
    name: 'Sweat-shirt',
    description: 'Sweat-shirt à capuche',
    category: 'sweat',
    availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    availableColors: ['Noir', 'Gris', 'Bleu', 'Rouge'],
  },
  {
    id: '4',
    name: 'Casquette',
    description: 'Casquette ajustable',
    category: 'casquette',
    availableSizes: ['Taille unique'],
    availableColors: ['Noir', 'Blanc', 'Bleu', 'Rouge'],
  },
]

// Positions disponibles par catégorie de produit
export const positionConfig: PositionConfig = {
  tshirt: [
    'poitrine-gauche',
    'poitrine-droite',
    'poitrine-centre',
    'dos-centre',
    'dos-haut',
    'manche-gauche',
    'manche-droite',
    'epaule-gauche',
    'epaule-droite',
    'custom',
  ],
  polo: [
    'poitrine-gauche',
    'poitrine-droite',
    'poitrine-centre',
    'dos-centre',
    'dos-haut',
    'epaule-gauche',
    'epaule-droite',
    'custom',
  ],
  sweat: [
    'poitrine-gauche',
    'poitrine-droite',
    'poitrine-centre',
    'dos-centre',
    'dos-haut',
    'manche-gauche',
    'manche-droite',
    'epaule-gauche',
    'epaule-droite',
    'custom',
  ],
  casquette: [
    'devant-centre',
    'devant-haut',
    'couronne',
    'cote-gauche',
    'cote-droite',
    'custom',
  ],
  autre: [
    'poitrine-gauche',
    'poitrine-droite',
    'poitrine-centre',
    'dos-centre',
    'dos-haut',
    'custom',
  ],
}

// Labels des positions
export const positionLabels: Record<PositionType, string> = {
  'poitrine-gauche': 'Poitrine gauche',
  'poitrine-droite': 'Poitrine droite',
  'poitrine-centre': 'Poitrine centre',
  'dos-centre': 'Dos centre',
  'dos-haut': 'Dos haut',
  'manche-gauche': 'Manche gauche',
  'manche-droite': 'Manche droite',
  'epaule-gauche': 'Épaule gauche',
  'epaule-droite': 'Épaule droite',
  'devant-centre': 'Devant centre',
  'devant-haut': 'Devant haut',
  'couronne': 'Couronne',
  'cote-gauche': 'Côté gauche',
  'cote-droite': 'Côté droit',
  'custom': 'Personnalisé',
}

// Techniques disponibles
export const techniques: Technique[] = [
  {
    id: 'serigraphie',
    name: 'Sérigraphie',
    description: 'Impression par sérigraphie, idéale pour grandes quantités',
  },
  {
    id: 'broderie',
    name: 'Broderie',
    description: 'Broderie de haute qualité, durable et élégante',
  },
  {
    id: 'dtf',
    name: 'DTF (Direct to Film)',
    description: 'Impression DTF moderne et polyvalente',
  },
]

// Dimensions disponibles pour les marquages
export const availableDimensions = [
  '5x5 cm',
  '10x10 cm',
  '15x15 cm',
  '20x20 cm',
  '25x25 cm',
  '10x15 cm',
  '15x20 cm',
  '20x30 cm',
  '30x40 cm',
  'Personnalisé',
]

// Configuration des options par technique
export const techniqueConfig: TechniqueConfig = {
  serigraphie: {
    minCouleurs: 1,
    maxCouleurs: 6,
    minEmplacements: 1,
    maxEmplacements: 4,
  },
  broderie: {
    minPoints: 1000,
    maxPoints: 50000,
    minEmplacements: 1,
    maxEmplacements: 3,
  },
  dtf: {
    minEmplacements: 1,
    maxEmplacements: 5,
    finitions: ['standard', 'premium'],
  },
}

// Options de délai
// Délai standard : 10 jours ouvrables par défaut
// Options de 10 à 1 jour ouvrable
export const delayOptions: Delay[] = [
  { type: 'standard', workingDays: 10 },
  { type: 'standard', workingDays: 9 },
  { type: 'standard', workingDays: 8 },
  { type: 'standard', workingDays: 7 },
  { type: 'standard', workingDays: 6 },
  { type: 'standard', workingDays: 5 },
  { type: 'standard', workingDays: 4 },
  { type: 'standard', workingDays: 3 },
  { type: 'standard', workingDays: 2 },
  { type: 'standard', workingDays: 1 },
  { 
    type: 'express', 
    workingDays: 10, // Référence pour le calcul du supplément
    isExpress: true,
    expressDays: 1, // 1 jour ouvrable (peut être ajusté jusqu'à 24h = 0.5)
  },
]

// Configuration des réductions de prix
// ⚠️ MODIFIER ICI LE POURCENTAGE DE RÉDUCTION SUR LE TEXTILE
export const TEXTILE_DISCOUNT_PERCENTAGE = 30 // Pourcentage de réduction (ex: 10 pour 10%, 15 pour 15%, etc.)

