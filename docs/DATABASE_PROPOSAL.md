# Proposition d'intégration d'une base de données

## 📊 État actuel du système

### Stockage actuel :
1. **localStorage** (côté client) : Devis en cours, produits sélectionnés
2. **Fichiers JSON** (`.cache/`) :
   - `odoo-products.json` : Cache des produits Odoo (24h)
   - `service-pricing.json` : Prix des services
   - `pricing-config.json` : Configuration des prix
3. **Cookies** : Sessions utilisateur (admin et client)
4. **Odoo** : Source de vérité pour produits et commandes finales

### Problèmes identifiés :
- ❌ **Perte de données** : localStorage peut être vidé par l'utilisateur
- ❌ **Pas d'historique** : Impossible de récupérer un devis abandonné
- ❌ **Pas de sauvegarde serveur** : Les devis en cours ne sont pas sauvegardés
- ❌ **Concurrence limitée** : Fichiers JSON = un seul accès à la fois
- ❌ **Pas de transactions** : Risque de corruption des données
- ❌ **Pas de requêtes complexes** : Difficile de faire des statistiques/rapports

## ✅ Avantages d'une base de données

### 1. **Persistance fiable**
- Sauvegarde automatique des devis en cours
- Récupération possible après fermeture du navigateur
- Historique complet des devis

### 2. **Performance**
- Indexation pour recherches rapides
- Requêtes optimisées
- Cache en mémoire

### 3. **Intégrité des données**
- Transactions ACID
- Contraintes de validation
- Relations entre tables

### 4. **Scalabilité**
- Support de multiples utilisateurs simultanés
- Migration facile vers PostgreSQL/MySQL pour la production

### 5. **Fonctionnalités avancées**
- Statistiques et rapports
- Recherche avancée
- Export de données
- Audit trail

## 🗄️ Solution proposée : Prisma + SQLite → PostgreSQL

### Pourquoi Prisma ?
- ✅ Type-safe (TypeScript natif)
- ✅ Migrations automatiques
- ✅ Excellent DX (Developer Experience)
- ✅ Support multi-base (SQLite, PostgreSQL, MySQL)

### Pourquoi SQLite pour commencer ?
- ✅ Aucune installation requise
- ✅ Fichier unique, facile à sauvegarder
- ✅ Parfait pour développement et petites équipes
- ✅ Migration transparente vers PostgreSQL plus tard

## 📐 Schéma de base de données proposé

```prisma
// Schema Prisma

// Sessions utilisateur
model Session {
  id        String   @id @default(cuid())
  userId    String
  userType  String   // 'admin' | 'client'
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@index([token])
  @@index([userId])
}

// Clients (cache des données Odoo)
model Client {
  id          String   @id @default(cuid())
  odooId      Int      @unique // ID dans Odoo
  name        String
  email       String   @unique
  company     String?
  phone       String?
  street      String?
  city        String?
  zip         String?
  country     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  quotes      Quote[]
  
  @@index([email])
  @@index([odooId])
}

// Devis/Commandes
model Quote {
  id              String   @id @default(cuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id])
  
  // État du devis
  status          String   @default("draft") // draft, submitted, validated, rejected
  step            String   @default("products") // products, customization, review
  
  // Informations client
  clientName      String
  clientEmail     String
  clientCompany   String?
  clientPhone     String?
  
  // Livraison
  deliveryType    String   // 'livraison' | 'pickup'
  deliveryAddress Json?    // { street, city, zip, country }
  
  // Délai
  delayWorkingDays Int
  delayType       String   // 'standard' | 'express'
  delayExpressDays Int?
  
  // Données du devis
  selectedProducts Json    // SelectedProduct[]
  markings         Json    // Marking[]
  quoteItems       Json    // QuoteItem[]
  
  // Totaux
  totalHT          Float
  totalTTC         Float?
  
  // Odoo
  odooOrderId     Int?     @unique // ID de la commande dans Odoo
  
  // Métadonnées
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  submittedAt     DateTime?
  
  @@index([clientId])
  @@index([status])
  @@index([createdAt])
}

// Cache des produits Odoo
model ProductCache {
  id          String   @id @default(cuid())
  odooId      Int      @unique
  name        String
  basePrice   Float
  category    String?
  colors      Json     // string[]
  sizes       Json     // ProductSize[]
  variantPrices Json?  // Record<string, number>
  lastSync    DateTime @default(now())
  
  @@index([odooId])
  @@index([category])
}

// Configuration des prix des services
model ServicePricing {
  id              String   @id @default(cuid())
  technique       String   @unique // 'serigraphie' | 'broderie' | 'dtf'
  minQuantity     Int
  quantityRanges  Json     // QuantityRange[]
  colorCounts     Json?    // Pour sérigraphie
  pointRanges     Json?    // Pour broderie
  dimensions      Json?    // Pour DTF
  prices          Json     // Cross-table prices
  fixedFeePerColor Float?  // Pour sérigraphie
  fixedFeeSmallDigitization Float? // Pour broderie
  fixedFeeLargeDigitization Float? // Pour broderie
  smallDigitizationThreshold Int? // Pour broderie
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Configuration globale des prix
model PricingConfig {
  id                      String   @id @default(cuid())
  textileDiscountPercentage Float  @default(30)
  clientProvidedIndexation Float   @default(10)
  expressSurchargePercent  Float   @default(10) // 10% par jour
  updatedAt               DateTime @updatedAt
  
  @@unique // Une seule configuration
}
```

## 🚀 Plan de migration

### Phase 1 : Installation et setup (1-2h)
1. Installer Prisma
2. Créer le schéma
3. Initialiser SQLite
4. Créer les migrations

### Phase 2 : Migration des données existantes (2-3h)
1. Migrer `service-pricing.json` → `ServicePricing`
2. Migrer `pricing-config.json` → `PricingConfig`
3. Créer un script de migration des produits Odoo

### Phase 3 : Remplacement du localStorage (3-4h)
1. Créer API routes pour sauvegarder/charger les devis
2. Remplacer localStorage par appels API
3. Sauvegarder automatiquement à chaque étape

### Phase 4 : Sessions serveur (2-3h)
1. Migrer les cookies vers sessions DB
2. Implémenter refresh tokens
3. Gestion de l'expiration

### Phase 5 : Fonctionnalités avancées (optionnel)
1. Historique des devis
2. Statistiques et rapports
3. Export de données

## 📦 Installation

```bash
# Installer Prisma
npm install prisma @prisma/client

# Initialiser Prisma
npx prisma init --datasource-provider sqlite

# Créer les migrations
npx prisma migrate dev --name init

# Générer le client Prisma
npx prisma generate
```

## 🔄 Migration vers PostgreSQL (plus tard)

Quand vous serez prêt pour la production :

```bash
# Changer le provider dans schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# Créer une nouvelle migration
npx prisma migrate dev --name migrate_to_postgresql
```

## 💡 Exemples d'utilisation

### Sauvegarder un devis en cours
```typescript
// app/api/quotes/save/route.ts
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const { clientId, quoteData } = await request.json()
  
  const quote = await prisma.quote.upsert({
    where: { clientId },
    update: { ...quoteData, updatedAt: new Date() },
    create: { clientId, ...quoteData }
  })
  
  return Response.json({ success: true, quote })
}
```

### Charger un devis en cours
```typescript
// app/api/quotes/current/route.ts
export async function GET(request: Request) {
  const clientId = getClientIdFromSession(request)
  
  const quote = await prisma.quote.findFirst({
    where: {
      clientId,
      status: 'draft'
    },
    orderBy: { updatedAt: 'desc' }
  })
  
  return Response.json({ quote })
}
```

### Statistiques
```typescript
// Nombre de devis par mois
const stats = await prisma.quote.groupBy({
  by: ['status'],
  _count: true,
  where: {
    createdAt: { gte: new Date('2024-01-01') }
  }
})
```

## ⚡ Avantages immédiats

1. **Sauvegarde automatique** : Plus de perte de données
2. **Récupération** : Les clients peuvent reprendre leur devis
3. **Historique** : Voir tous les devis d'un client
4. **Performance** : Requêtes optimisées avec index
5. **Sécurité** : Validation côté serveur
6. **Scalabilité** : Prêt pour la croissance

## 🎯 Recommandation

**Je recommande fortement cette migration** car elle :
- ✅ Résout les problèmes de persistance actuels
- ✅ Améliore l'expérience utilisateur
- ✅ Facilite la maintenance
- ✅ Prépare l'application pour la production
- ✅ Permet des fonctionnalités futures (stats, exports, etc.)

Souhaitez-vous que je procède à cette migration ?

