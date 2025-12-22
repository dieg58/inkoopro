#!/bin/bash
# Script pour basculer le schema Prisma vers SQLite (développement local)

echo "🔄 Basculement vers SQLite pour le développement local..."

# Sauvegarder le schema actuel
cp prisma/schema.prisma prisma/schema.prisma.backup

# Remplacer postgresql par sqlite
sed -i '' 's/provider = "postgresql"/provider = "sqlite"/g' prisma/schema.prisma
sed -i '' 's/provider = "postgresql" \/\/ Utilisez "sqlite"/provider = "sqlite" \/\/ Développement local/g' prisma/schema.prisma

echo "✅ Schema Prisma basculé vers SQLite"
echo "⚠️  N'oubliez pas de régénérer Prisma Client : npx prisma generate"
echo "⚠️  Pour revenir à PostgreSQL : ./scripts/switch-to-postgresql.sh"


