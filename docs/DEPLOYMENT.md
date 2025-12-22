# Guide de déploiement en production

Ce guide vous explique comment déployer INKOO PRO en production.

## Prérequis

1. Un compte Vercel (gratuit) : https://vercel.com
2. Une base de données PostgreSQL (gratuite) :
   - **Vercel Postgres** (recommandé, intégré) : https://vercel.com/storage/postgres
   - **Supabase** (gratuit) : https://supabase.com
   - **Neon** (gratuit) : https://neon.tech
   - **Railway** (gratuit) : https://railway.app

## Étape 1 : Préparer la base de données PostgreSQL

### Option A : Vercel Postgres (Recommandé)

1. Allez sur https://vercel.com/storage/postgres
2. Créez une nouvelle base de données
3. Notez la chaîne de connexion (DATABASE_URL)

### Option B : Supabase

1. Créez un compte sur https://supabase.com
2. Créez un nouveau projet
3. Allez dans **Settings > Database**
4. Copiez la **Connection string** (URI mode)

### Option C : Neon

1. Créez un compte sur https://neon.tech
2. Créez un nouveau projet
3. Copiez la **Connection string**

## Étape 2 : Modifier le schéma Prisma pour PostgreSQL

Le schéma Prisma est déjà configuré pour supporter PostgreSQL. Assurez-vous que votre `DATABASE_URL` pointe vers PostgreSQL en production.

## Étape 3 : Déployer sur Vercel

### 3.1 Préparer le projet

1. Assurez-vous que votre code est sur GitHub/GitLab/Bitbucket
2. Vérifiez que tous les fichiers sont commités

### 3.2 Créer le projet sur Vercel

1. Allez sur https://vercel.com/new
2. Importez votre repository
3. Vercel détectera automatiquement Next.js

### 3.3 Configurer les variables d'environnement

**⚠️ IMPORTANT :** La variable `DATABASE_URL` doit être définie **AVANT** le build, car Prisma en a besoin pour générer le client et pousser le schéma.

Dans les **Settings > Environment Variables** de votre projet Vercel, ajoutez :

#### Variables obligatoires

```env
# Base de données PostgreSQL
# ⚠️ Cette variable DOIT être définie pour que le build fonctionne
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Odoo (si configuré)
NEXT_PUBLIC_ODOO_URL="https://votre-odoo.com"
NEXT_PUBLIC_ODOO_DB="votre_base"
NEXT_PUBLIC_ODOO_USERNAME="votre_utilisateur"
NEXT_PUBLIC_ODOO_PASSWORD="votre_mot_de_passe"
ODOO_API_KEY="votre_cle_api" # Optionnel mais recommandé

# Admin
ADMIN_PASSWORD="votre_mot_de_passe_admin_securise"

# Next.js
NODE_ENV="production"
```

#### Variables optionnelles

```env
# Si vous utilisez Vercel Postgres, la DATABASE_URL est automatiquement ajoutée
# Mais vous devez quand même la vérifier dans Settings > Environment Variables
```

**Note :** Si vous utilisez Vercel Postgres, la variable `DATABASE_URL` est automatiquement ajoutée, mais vérifiez qu'elle est bien présente dans **Settings > Environment Variables** et qu'elle est disponible pour **Production, Preview, et Development**.

### 3.4 Configurer le build

Vercel détectera automatiquement Next.js. Assurez-vous que le **Build Command** est :
```bash
npm run build
```

Et que le **Output Directory** est :
```
.next
```

### 3.5 Ajouter le script de migration

Dans les **Settings > Build & Development Settings**, ajoutez un **Build Command** personnalisé :

```bash
npx prisma generate && npx prisma migrate deploy && npm run build
```

Ou créez un fichier `vercel.json` à la racine :

```json
{
  "buildCommand": "npx prisma generate && npx prisma migrate deploy && npm run build"
}
```

## Étape 4 : Migrer les données

### 4.1 Migrer le schéma de la base de données

Après le premier déploiement, exécutez les migrations :

```bash
# En local, connectez-vous à votre base PostgreSQL de production
npx prisma migrate deploy
```

Ou utilisez Prisma Studio pour vérifier :

```bash
npx prisma studio
```

### 4.2 Migrer les données existantes (si vous avez des données en local)

Si vous avez des données dans votre SQLite locale que vous voulez migrer :

1. Exportez les données de SQLite
2. Importez-les dans PostgreSQL

Ou utilisez le script de migration existant après avoir modifié la DATABASE_URL :

```bash
# Modifier temporairement .env.local pour pointer vers PostgreSQL
DATABASE_URL="postgresql://..."

# Exécuter le script de migration
npm run db:migrate
```

## Étape 5 : Vérifier le déploiement

1. Vérifiez que l'application fonctionne : `https://votre-projet.vercel.app`
2. Testez la connexion à la base de données
3. Testez l'interface admin : `https://votre-projet.vercel.app/admin/login`
4. Testez la création d'un devis

## Étape 6 : Configuration post-déploiement

### 6.1 Initialiser les données par défaut

Connectez-vous à l'admin et configurez :
- Les prix des services
- Le mapping Odoo
- Les facteurs de prix

### 6.2 Configurer un domaine personnalisé (optionnel)

Dans Vercel, allez dans **Settings > Domains** et ajoutez votre domaine.

## Dépannage

### Erreur : "Unable to open the database file"

Cela signifie que vous utilisez encore SQLite. Vérifiez que :
- `DATABASE_URL` pointe vers PostgreSQL
- Le schéma Prisma utilise `provider = "postgresql"` (ou est configuré dynamiquement)

### Erreur : "Migration failed"

1. Vérifiez que la base de données est accessible
2. Vérifiez les permissions de l'utilisateur PostgreSQL
3. Exécutez `npx prisma migrate deploy` manuellement

### Erreur : "Prisma Client not generated"

Ajoutez `npx prisma generate` dans le build command.

## Commandes utiles

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy

# Ouvrir Prisma Studio (pour inspecter la base)
npx prisma studio

# Vérifier le schéma
npx prisma validate
```

## Support

En cas de problème, vérifiez :
- Les logs Vercel : **Deployments > [votre déploiement] > Logs**
- Les logs de la base de données
- La console du navigateur pour les erreurs client

