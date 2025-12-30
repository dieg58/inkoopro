#!/bin/bash

# Script pour synchroniser manuellement la base de données de production
# Utilisez ce script si la base de données de production n'est pas à jour

echo "🔄 Synchronisation de la base de données de production"
echo ""

# Vérifier que DATABASE_URL est configuré
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erreur: DATABASE_URL n'est pas défini"
  echo "   Configurez DATABASE_URL avec votre chaîne de connexion PostgreSQL"
  echo "   Exemple: export DATABASE_URL='postgresql://user:password@host:port/database?schema=public'"
  exit 1
fi

# Détecter le type de base de données
if [[ "$DATABASE_URL" == postgresql* ]]; then
  echo "✅ Base de données PostgreSQL détectée"
  DB_TYPE="postgresql"
elif [[ "$DATABASE_URL" == file:* ]]; then
  echo "❌ Erreur: Ce script est pour la production (PostgreSQL)"
  echo "   Pour SQLite, utilisez: npm run setup:local"
  exit 1
else
  echo "⚠️  Type de base de données non reconnu"
  DB_TYPE="unknown"
fi

# Configuration Prisma pour PostgreSQL
echo ""
echo "🔧 Configuration Prisma pour PostgreSQL..."
cp prisma/schema.prisma.postgresql prisma/schema.prisma

# Générer le client Prisma
echo ""
echo "📦 Génération du client Prisma..."
npx prisma generate

# Essayer d'abord avec migrate deploy (si des migrations existent)
echo ""
echo "🔄 Tentative d'application des migrations..."
if npx prisma migrate deploy 2>/dev/null; then
  echo "✅ Migrations appliquées avec succès"
else
  echo "⚠️  Aucune migration trouvée, utilisation de db push..."
  
  # Utiliser db push comme fallback
  echo ""
  echo "📤 Synchronisation du schéma avec db push..."
  npx prisma db push --accept-data-loss
  
  if [ $? -eq 0 ]; then
    echo "✅ Schéma synchronisé avec succès"
  else
    echo "❌ Erreur lors de la synchronisation"
    exit 1
  fi
fi

echo ""
echo "✅ Synchronisation terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Vérifiez que toutes les tables sont créées"
echo "   2. Initialisez les données par défaut via l'interface admin"
echo "   3. Configurez les prix des services et le mapping Odoo"

