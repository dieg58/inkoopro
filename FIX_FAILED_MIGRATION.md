# 🔧 Résoudre les migrations échouées

## Problème

Une migration a échoué dans la base de données et Prisma refuse d'appliquer de nouvelles migrations.

## Solution : Nettoyer l'état des migrations

### Option 1 : Via l'éditeur SQL de Supabase (RECOMMANDÉ)

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Allez dans **SQL Editor**
4. Exécutez cette requête :

```sql
-- Supprimer l'entrée de migration échouée
DELETE FROM "_prisma_migrations" 
WHERE "migration_name" = '20251216195655_init' 
AND "finished_at" IS NULL;
```

5. Cliquez sur **Run**

### Option 2 : Vérifier si les tables existent déjà

Si les tables ont été partiellement créées, vous pouvez :

1. Vérifier dans **Table Editor** de Supabase si les tables existent
2. Si elles existent, marquer la migration comme résolue :

```sql
UPDATE "_prisma_migrations" 
SET "finished_at" = NOW(), "rolled_back_at" = NULL 
WHERE "migration_name" = '20251216195655_init' 
AND "finished_at" IS NULL;
```

### Option 3 : Réinitialiser complètement (si aucune donnée importante)

⚠️ **ATTENTION** : Cela supprimera toutes les données !

```sql
-- Supprimer toutes les tables
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "Client" CASCADE;
DROP TABLE IF EXISTS "Quote" CASCADE;
DROP TABLE IF EXISTS "ProductCache" CASCADE;
DROP TABLE IF EXISTS "ServicePricing" CASCADE;
DROP TABLE IF EXISTS "PricingConfig" CASCADE;
DROP TABLE IF EXISTS "ServiceOdooMapping" CASCADE;
```

Puis redéployez sur Vercel.

## Après avoir nettoyé

1. Redéployez sur Vercel (ou attendez le redéploiement automatique)
2. Les migrations devraient maintenant s'appliquer correctement

## Vérification

Dans Supabase > Table Editor, vous devriez voir toutes les tables créées :
- Session
- Client
- Quote
- ProductCache
- ServicePricing
- PricingConfig
- ServiceOdooMapping

