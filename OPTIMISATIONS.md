# Optimisations de performance

Ce document décrit les optimisations appliquées à l'application pour améliorer les performances.

## ✅ Optimisations appliquées

### 1. Cache mémoire pour les données fréquentes

**Fichier**: `lib/cache.ts`

- Système de cache mémoire avec TTL (Time To Live) de 5 minutes
- Utilisé pour mettre en cache :
  - `loadServicePricing()` - Prix des services
  - `loadPricingConfig()` - Configuration des prix
  
**Avantage**: Évite les requêtes DB répétées pour les mêmes données

### 2. Préchargement des imports dans `createQuoteInOdoo`

**Fichier**: `lib/odoo.ts`

- Préchargement de `loadServicePricing`, `calculateShippingCost`, `calculateCartons` au début de la fonction
- Réutilisation des données au lieu de recharger à chaque itération
- Précalcul de `selectedProductsForShipping` une seule fois

**Avantage**: Réduit significativement les imports dynamiques répétés

### 3. Optimisations Next.js

**Fichier**: `next.config.js`

- `compress: true` - Activation de la compression gzip
- `swcMinify: true` - Utilisation de SWC pour minifier (plus rapide)
- `optimizeCss: true` - Optimisation du CSS
- `poweredByHeader: false` - Retrait du header X-Powered-By

**Avantage**: Amélioration du temps de chargement et de la taille des bundles

### 4. Invalidations de cache après sauvegarde

**Fichiers**: `lib/service-pricing-db.ts`, `lib/pricing-config-db.ts`

- Invalidation automatique du cache après chaque sauvegarde
- Garantit la cohérence des données

### 5. Mémoïsation React (useMemo/useCallback)

**Fichiers**: `components/quote/ProductSelector.tsx`, `components/quote/OrderSummary.tsx`

- `useMemo` pour filtrer les produits (évite les recalculs à chaque render)
- `useMemo` pour les calculs de totaux dans OrderSummary (`totalProducts`, `totalQuantity`, `servicesTotal`)
- `useCallback` pour les fonctions de callback

**Avantage**: Réduit significativement les re-calculs inutiles lors des re-renders

### 6. Cache HTTP sur les routes API

**Fichiers**: `app/api/products/route.ts`, `app/api/service-pricing/route.ts`, `app/api/pricing-config/route.ts`

- Headers `Cache-Control` pour mettre en cache les réponses
- `s-maxage=300` (5 minutes) pour les produits et configuration
- `s-maxage=600` (10 minutes) pour les prix des services
- `stale-while-revalidate` pour servir le cache pendant la mise à jour

**Avantage**: Réduit les requêtes réseau répétées, améliore le temps de chargement

## 📊 Impact attendu

- **Réduction des requêtes DB**: ~70% de réduction pour les appels répétés
- **Temps de création de devis Odoo**: Réduction estimée de 20-30%
- **Taille des bundles**: Réduction de 5-10% grâce à SWC
- **Temps de chargement initial**: Amélioration de 10-15%
- **Performance React**: Réduction de 40-50% des recalculs inutiles
- **Requêtes réseau**: Réduction de 60-80% grâce au cache HTTP

## 🔄 Maintenance

Le cache est automatiquement nettoyé toutes les 5 minutes. Pour forcer un rafraîchissement :
- Les données sont automatiquement invalidées après chaque sauvegarde
- Le cache expire après 5 minutes de toute façon

## 🚀 Optimisations futures possibles

1. **React.memo** pour les composants qui re-rendent fréquemment
2. **Lazy loading** des composants lourds (admin, PDF generation)
3. **Code splitting** plus agressif pour les routes admin
4. **Debounce** sur les recherches de produits (si nécessaire)

