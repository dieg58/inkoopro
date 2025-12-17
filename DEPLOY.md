# 🚀 Guide de déploiement rapide

## Étape 1 : Configurer la base de données PostgreSQL

Vous avez déjà une base Supabase ! Utilisez cette chaîne de connexion :

```
postgresql://postgres:[VOTRE-MOT-DE-PASSE]@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public
```

**Important** : Remplacez `[VOTRE-MOT-DE-PASSE]` par votre mot de passe Supabase réel.

### Trouver votre mot de passe Supabase
1. Allez sur https://supabase.com
2. Connectez-vous à votre projet
3. Allez dans **Settings > Database**
4. Le mot de passe est affiché dans la section "Connection string" ou "Database password"

## Étape 2 : Modifier le schéma Prisma pour PostgreSQL

**Important** : Avant de déployer, modifiez `prisma/schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"  // Changez de "sqlite" à "postgresql"
  url      = env("DATABASE_URL")
}
```

Puis régénérez le client :
```bash
npx prisma generate
```

## Étape 3 : Déployer sur Vercel

1. **Poussez votre code sur GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push
   ```

2. **Importez sur Vercel**
   - Allez sur https://vercel.com/new
   - Importez votre repository
   - Vercel détectera automatiquement Next.js

3. **Configurez les variables d'environnement**
   
   Dans Vercel > Settings > Environment Variables, ajoutez :

   ```env
   # Si vous utilisez Vercel Postgres, DATABASE_URL est automatique
   # Sinon, ajoutez votre DATABASE_URL PostgreSQL
   DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
   
   # Odoo
   NEXT_PUBLIC_ODOO_URL="https://votre-odoo.com"
   NEXT_PUBLIC_ODOO_DB="votre_base"
   NEXT_PUBLIC_ODOO_USERNAME="votre_utilisateur"
   NEXT_PUBLIC_ODOO_PASSWORD="votre_mot_de_passe"
   ODOO_API_KEY="votre_cle_api"
   
   # Admin
   ADMIN_PASSWORD="votre_mot_de_passe_securise"
   
   # Environment
   NODE_ENV="production"
   ```

4. **Déployez**
   - Cliquez sur "Deploy"
   - Vercel va automatiquement :
     - Installer les dépendances
     - Générer Prisma Client
     - Appliquer les migrations
     - Builder l'application

## Étape 4 : Vérifier le déploiement

1. Attendez la fin du build (2-3 minutes)
2. Visitez votre URL : `https://votre-projet.vercel.app`
3. Testez l'admin : `https://votre-projet.vercel.app/admin/login`
4. Configurez les données initiales dans l'admin

## ⚠️ Important : Retour au développement local

Après le déploiement, pour revenir au développement local avec SQLite :

1. Modifiez `prisma/schema.prisma` :
   ```prisma
   datasource db {
     provider = "sqlite"  // Remettez "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. Régénérez le client :
   ```bash
   npx prisma generate
   ```

## 🔧 Dépannage

### Erreur "Unable to open the database file"
→ Vous utilisez encore SQLite. Vérifiez que `provider = "postgresql"` dans le schéma.

### Erreur "Migration failed"
→ Vérifiez que votre `DATABASE_URL` est correcte et que la base est accessible.

### Erreur "Prisma Client not generated"
→ Le fichier `vercel.json` est déjà configuré pour générer Prisma automatiquement.

## 📝 Checklist avant déploiement

- [ ] Code commité et poussé sur GitHub
- [ ] Schéma Prisma modifié pour PostgreSQL
- [ ] Base de données PostgreSQL créée
- [ ] Variables d'environnement préparées
- [ ] `ADMIN_PASSWORD` changé (pas le défaut)
- [ ] `vercel.json` présent à la racine

## 🎉 C'est tout !

Votre application sera accessible à `https://votre-projet.vercel.app`

