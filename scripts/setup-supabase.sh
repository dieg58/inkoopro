#!/bin/bash

# Script de configuration pour Supabase PostgreSQL

echo "🚀 Configuration Supabase pour INKOO PRO"
echo ""

# Vérifier que DATABASE_URL est configuré
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erreur: DATABASE_URL n'est pas défini"
  echo ""
  echo "Configurez DATABASE_URL avec votre chaîne de connexion Supabase :"
  echo "export DATABASE_URL='postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public'"
  exit 1
fi

# Vérifier que c'est bien Supabase
if [[ "$DATABASE_URL" != *"supabase.co"* ]]; then
  echo "⚠️  Attention: Cette URL ne semble pas être Supabase"
  echo "   URL détectée: ${DATABASE_URL:0:50}..."
fi

echo "✅ DATABASE_URL configuré"
echo ""

# Vérifier le schéma Prisma
echo "📋 Vérification du schéma Prisma..."
PROVIDER=$(grep -A 2 "datasource db" prisma/schema.prisma | grep "provider" | awk '{print $3}' | tr -d '"')

if [ "$PROVIDER" != "postgresql" ]; then
  echo "⚠️  Le schéma Prisma n'utilise pas PostgreSQL (actuellement: $PROVIDER)"
  echo "   Modifiez prisma/schema.prisma pour utiliser provider = \"postgresql\""
  exit 1
fi

echo "✅ Schéma Prisma configuré pour PostgreSQL"
echo ""

# Générer le client Prisma
echo "📦 Génération du client Prisma..."
npx prisma generate

if [ $? -ne 0 ]; then
  echo "❌ Erreur lors de la génération du client Prisma"
  exit 1
fi

echo "✅ Client Prisma généré"
echo ""

# Tester la connexion
echo "🔌 Test de connexion à Supabase..."
npx prisma db execute --stdin <<< "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Connexion à Supabase réussie !"
else
  echo "⚠️  Impossible de tester la connexion automatiquement"
  echo "   Essayez manuellement: npx prisma studio"
fi

echo ""

# Appliquer les migrations
echo "🔄 Application des migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migrations appliquées avec succès !"
  echo ""
  echo "📝 Prochaines étapes:"
  echo "   1. Ouvrez Prisma Studio pour vérifier: npx prisma studio"
  echo "   2. Initialisez les données par défaut via l'interface admin"
  echo "   3. Configurez les prix des services et le mapping Odoo"
else
  echo ""
  echo "❌ Erreur lors de l'application des migrations"
  echo "   Vérifiez que:"
  echo "   - Votre mot de passe est correct"
  echo "   - La base de données est accessible"
  echo "   - Vous avez les permissions nécessaires"
fi

