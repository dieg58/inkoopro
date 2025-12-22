# Guide de développement local

## Configuration recommandée

### Option 1 : Utiliser PostgreSQL aussi en local (Plus simple) ✅

**Avantages :**
- Même environnement que la production
- Pas besoin de changer le schema.prisma
- Migrations identiques

**Configuration `.env.local` :**
```env
# Base de données PostgreSQL (même que production pour simplicité)
DATABASE_URL="postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public"

# Configuration Odoo
NEXT_PUBLIC_ODOO_URL=https://inkoo.odoo.com
NEXT_PUBLIC_ODOO_DB=inkoo-main-11762417
NEXT_PUBLIC_ODOO_USERNAME=diego@inkoo.eu
# ... autres variables
```

**⚠️ Note :** Vous partagez la même base de données que la production. Utilisez des données de test.

---

### Option 2 : Utiliser SQLite en local (Plus isolé) 🔒

**Avantages :**
- Base de données locale isolée
- Plus rapide
- Pas besoin de connexion internet

**Étapes :**

1. **Modifier `.env.local` :**
```env
# Base de données locale (SQLite)
DATABASE_URL="file:./prisma/dev.db"

# Configuration Odoo
NEXT_PUBLIC_ODOO_URL=https://inkoo.odoo.com
NEXT_PUBLIC_ODOO_DB=inkoo-main-11762417
NEXT_PUBLIC_ODOO_USERNAME=diego@inkoo.eu
# ... autres variables
```

2. **Basculer le schema vers SQLite :**
```bash
./scripts/switch-to-sqlite.sh
npx prisma generate
npx prisma migrate dev
```

3. **Pour revenir à PostgreSQL avant de push :**
```bash
./scripts/switch-to-postgresql.sh
npx prisma generate
```

---

## Commandes de développement

```bash
# Démarrer le serveur de développement
npm run dev
# → http://localhost:3000

# Vérifier les erreurs TypeScript
npm run build

# Voir la base de données (Prisma Studio)
npm run db:studio
# → Interface graphique pour voir/modifier les données

# Migrations (selon votre choix)
npm run migrate          # SQLite ou PostgreSQL selon config
npm run migrate:deploy   # PostgreSQL (production)
```

## Checklist de configuration

- [ ] `.env.local` existe et est correctement configuré
- [ ] `DATABASE_URL` pointe vers la bonne base de données
- [ ] Variables Odoo configurées
- [ ] `npm install` exécuté
- [ ] `npx prisma generate` exécuté
- [ ] Migrations appliquées (`npm run migrate`)

## Dépannage

### Erreur : "Can't reach database server"
→ Vérifiez votre `DATABASE_URL` dans `.env.local`

### Erreur : "P3009: migrate found failed migrations"
→ Exécutez : `npx tsx scripts/clean-failed-migrations.ts`

### Erreur : "PrismaClientInitializationError"
→ Régénérez Prisma Client : `npx prisma generate`

### Les changements ne s'appliquent pas
→ Redémarrez le serveur : `Ctrl+C` puis `npm run dev`


