#!/bin/bash
# Script pour basculer le schema Prisma vers PostgreSQL (production)

echo "🔄 Basculement vers PostgreSQL pour la production..."

# Restaurer depuis le backup ou forcer PostgreSQL
if [ -f prisma/schema.prisma.backup ]; then
  cp prisma/schema.prisma.backup prisma/schema.prisma
else
  sed -i '' 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma
  sed -i '' 's/provider = "sqlite" \/\/ Développement local/provider = "postgresql" \/\/ Production/g' prisma/schema.prisma
fi

echo "✅ Schema Prisma basculé vers PostgreSQL"
echo "⚠️  N'oubliez pas de régénérer Prisma Client : npx prisma generate"


