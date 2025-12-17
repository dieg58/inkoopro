-- Script SQL pour résoudre les migrations échouées dans Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- Option 1 : Marquer la migration comme résolue (si les tables existent déjà)
-- Décommentez cette ligne si les tables ont été créées malgré l'erreur
-- UPDATE "_prisma_migrations" SET "finished_at" = NOW(), "rolled_back_at" = NULL WHERE "migration_name" = '20251216195655_init' AND "finished_at" IS NULL;

-- Option 2 : Supprimer l'entrée de migration échouée (si les tables n'existent pas)
-- Décommentez cette ligne si vous voulez recommencer la migration
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20251216195655_init' AND "finished_at" IS NULL;

