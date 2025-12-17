#!/bin/bash

# Script de configuration pour la production
# Ce script aide à configurer l'environnement de production

echo "🚀 Configuration de la production pour INKOO PRO"
echo ""

# Vérifier que DATABASE_URL est configuré
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erreur: DATABASE_URL n'est pas défini"
  echo "   Configurez DATABASE_URL avec votre chaîne de connexion PostgreSQL"
  exit 1
fi

# Détecter le type de base de données
if [[ "$DATABASE_URL" == postgresql* ]]; then
  echo "✅ Base de données PostgreSQL détectée"
  DB_TYPE="postgresql"
elif [[ "$DATABASE_URL" == file:* ]]; then
  echo "✅ Base de données SQLite détectée"
  DB_TYPE="sqlite"
else
  echo "⚠️  Type de base de données non reconnu"
  DB_TYPE="unknown"
fi

# Générer le client Prisma
echo ""
echo "📦 Génération du client Prisma..."
npx prisma generate

# Appliquer les migrations
echo ""
echo "🔄 Application des migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Vérifiez que la base de données est accessible"
echo "   2. Initialisez les données par défaut via l'interface admin"
echo "   3. Configurez les prix des services et le mapping Odoo"

