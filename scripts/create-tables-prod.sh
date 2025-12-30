#!/bin/bash
# Script pour créer les tables dans Supabase PostgreSQL
# Utilise l'URL directe (sans pgbouncer) pour créer les tables

echo "🔧 Configuration Prisma pour PostgreSQL..."
cp prisma/schema.prisma.postgresql prisma/schema.prisma

echo "🔨 Génération du client Prisma..."
npx prisma generate

echo "📦 Push du schéma vers la base de données..."
echo "⚠️  Assurez-vous que DATABASE_URL pointe vers l'URL DIRECTE (sans pgbouncer) de Supabase"
echo "    Vous pouvez trouver cette URL dans Supabase > Settings > Database > Connection string (Direct connection)"
echo ""
npx prisma db push --accept-data-loss

echo "✅ Terminé !"

