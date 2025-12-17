#!/bin/bash

# Script pour tester la connexion à la base de données PostgreSQL

echo "🔍 Test de connexion à la base de données PostgreSQL..."
echo ""

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erreur: DATABASE_URL n'est pas défini"
  echo ""
  echo "Configurez DATABASE_URL dans votre .env.local ou exportez-la :"
  echo "export DATABASE_URL='postgresql://postgres:[PASSWORD]@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public'"
  exit 1
fi

# Vérifier que ce n'est pas SQLite
if [[ "$DATABASE_URL" == file:* ]]; then
  echo "⚠️  Attention: Vous utilisez SQLite, pas PostgreSQL"
  echo "   Changez DATABASE_URL pour pointer vers PostgreSQL"
  exit 1
fi

echo "✅ DATABASE_URL configuré"
echo ""

# Générer le client Prisma
echo "📦 Génération du client Prisma..."
npx prisma generate

# Tester la connexion avec Prisma
echo ""
echo "🔌 Test de connexion à la base de données..."
npx prisma db execute --stdin <<< "SELECT 1;" 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Connexion réussie !"
  echo ""
  echo "📋 Prochaines étapes:"
  echo "   1. Appliquez les migrations: npx prisma migrate deploy"
  echo "   2. Vérifiez le schéma: npx prisma studio"
else
  echo ""
  echo "❌ Échec de la connexion"
  echo "   Vérifiez que:"
  echo "   - Votre mot de passe est correct"
  echo "   - La base de données est accessible"
  echo "   - Le schéma Prisma utilise provider = 'postgresql'"
fi

