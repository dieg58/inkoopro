# 🔄 Synchronisation de la base de données de production

Ce guide explique comment synchroniser la base de données de production avec le schéma Prisma actuel.

## Problème

Si vous constatez que :
- Les dernières modifications du schéma ne sont pas appliquées en production
- Des tables ou colonnes manquent dans la base de données de production
- Les prix sauvegardés ne s'affichent pas correctement

Cela signifie que la base de données de production n'est pas synchronisée avec le code.

## Solution : Synchronisation manuelle

### Option 1 : Via le script automatique (Recommandé)

1. **Configurez la variable d'environnement DATABASE_URL** :
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
   ```
   
   ⚠️ **Important** : Utilisez l'URL de connexion **DIRECTE** (sans pgbouncer) de Supabase :
   - Allez dans Supabase > Settings > Database
   - Copiez la "Connection string" avec "Direct connection" (pas "Session mode")

2. **Exécutez le script de synchronisation** :
   ```bash
   ./scripts/sync-production-db.sh
   ```

Le script va :
- ✅ Configurer Prisma pour PostgreSQL
- ✅ Générer le client Prisma
- ✅ Essayer d'appliquer les migrations (si elles existent)
- ✅ Sinon, utiliser `db push` pour synchroniser le schéma

### Option 2 : Via les commandes Prisma directement

1. **Configurer Prisma pour PostgreSQL** :
   ```bash
   cp prisma/schema.prisma.postgresql prisma/schema.prisma
   ```

2. **Générer le client Prisma** :
   ```bash
   npx prisma generate
   ```

3. **Synchroniser le schéma** :
   ```bash
   # Option A : Si vous avez des migrations
   npx prisma migrate deploy
   
   # Option B : Sinon, utiliser db push
   npx prisma db push --accept-data-loss
   ```

## Vérification

Après la synchronisation, vérifiez que :

1. **Toutes les tables existent** :
   - `Session`
   - `Client`
   - `Quote`
   - `ProductCache`
   - `ServicePricing`
   - `PricingConfig` ⚠️ **Important pour les prix**
   - `ServiceOdooMapping`
   - `ServiceOdooFeeMapping`
   - `DeliveryOdooMapping`
   - `OptionOdooMapping`

2. **La table PricingConfig existe et contient les bonnes colonnes** :
   ```sql
   SELECT * FROM "PricingConfig";
   ```
   
   Doit contenir :
   - `id` (doit être 'singleton')
   - `textileDiscountPercentage`
   - `clientProvidedIndexation`
   - `expressSurchargePercent`
   - `individualPackagingPrice`
   - `newCartonPrice`
   - `vectorizationPrice`
   - `courierPricePerKm`
   - `courierMinimumFee`
   - `updatedAt`

3. **Initialiser les données par défaut** :
   - Connectez-vous à l'admin : `https://votre-app.vercel.app/admin/login`
   - Allez dans **Facteurs de prix**
   - Les valeurs par défaut devraient être créées automatiquement
   - Sinon, sauvegardez une fois pour créer l'enregistrement

## Déploiement automatique

Le fichier `vercel.json` est configuré pour :
1. Essayer d'appliquer les migrations (`migrate deploy`)
2. Sinon, utiliser `db push` comme fallback
3. Continuer le build même en cas d'erreur (pour éviter les builds bloqués)

Cependant, si vous modifiez le schéma Prisma, il est recommandé de :
1. Synchroniser manuellement après le déploiement
2. Ou créer des migrations Prisma pour un meilleur contrôle

## Créer des migrations Prisma (Optionnel, pour l'avenir)

Pour un meilleur contrôle des changements de schéma :

1. **Créer une migration** :
   ```bash
   npx prisma migrate dev --name nom_de_la_migration
   ```

2. **Les migrations seront dans** `prisma/migrations/`

3. **En production, elles seront appliquées automatiquement** via `migrate deploy`

## Dépannage

### Erreur : "Database connection failed"
- Vérifiez que `DATABASE_URL` est correcte
- Vérifiez que vous utilisez l'URL DIRECTE (pas pgbouncer)
- Vérifiez que le mot de passe est correctement encodé (ex: `%21` pour `!`)

### Erreur : "Table already exists"
- C'est normal si la table existe déjà
- `db push` va mettre à jour le schéma sans supprimer les données existantes

### Erreur : "Column does not exist"
- La colonne n'a pas été créée
- Relancez la synchronisation
- Vérifiez que le schéma Prisma contient bien la colonne

### Les prix ne s'affichent toujours pas
1. Vérifiez que la table `PricingConfig` existe
2. Vérifiez qu'elle contient un enregistrement avec `id = 'singleton'`
3. Si non, connectez-vous à l'admin et sauvegardez une fois la configuration
4. Vérifiez les logs de l'application pour voir les erreurs

