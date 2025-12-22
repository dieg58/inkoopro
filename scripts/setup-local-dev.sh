#!/bin/bash

# Script pour configurer l'environnement de développement local avec SQLite

echo "🔧 Configuration de l'environnement de développement local avec SQLite..."

# Vérifier si le schéma SQLite existe
if [ ! -f "prisma/schema.sqlite.prisma" ]; then
    echo "❌ Erreur: prisma/schema.sqlite.prisma n'existe pas"
    exit 1
fi

# Sauvegarder le schéma PostgreSQL actuel
if [ -f "prisma/schema.prisma" ]; then
    echo "📦 Sauvegarde du schéma PostgreSQL..."
    cp prisma/schema.prisma prisma/schema.prisma.postgresql
fi

# Copier le schéma SQLite
echo "📋 Copie du schéma SQLite..."
cp prisma/schema.sqlite.prisma prisma/schema.prisma

# Générer le client Prisma
echo "🔨 Génération du client Prisma pour SQLite..."
npx prisma generate

echo "✅ Configuration terminée ! Vous pouvez maintenant utiliser 'npm run dev'"
echo ""
echo "Pour revenir à PostgreSQL (production), exécutez:"
echo "  cp prisma/schema.prisma.postgresql prisma/schema.prisma && npx prisma generate"

