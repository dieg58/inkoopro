# 🚀 Déploiement sur Vercel

## ✅ Étape 1 : Code sur GitHub

Votre code est maintenant sur GitHub : https://github.com/dieg58/inkoopro.git

## 📝 Étape 2 : Créer un projet sur Vercel

1. Allez sur **https://vercel.com/new**
2. Si vous n'avez pas de compte, créez-en un (gratuit avec GitHub)
3. Cliquez sur **Import Git Repository**
4. Autorisez Vercel à accéder à GitHub (si demandé)
5. Sélectionnez le repository **dieg58/inkoopro**
6. Cliquez sur **Import**

## ⚙️ Étape 3 : Configuration du projet

Vercel va automatiquement détecter :
- ✅ Framework : Next.js
- ✅ Build Command : (déjà configuré dans `vercel.json`)
- ✅ Output Directory : `.next`

**Ne changez rien**, la configuration est déjà optimale !

## 🔐 Étape 4 : Variables d'environnement

**IMPORTANT** : Avant de cliquer sur "Deploy", ajoutez les variables d'environnement :

### Cliquez sur "Environment Variables"

Ajoutez ces variables une par une :

#### 1. DATABASE_URL (OBLIGATOIRE)
```
Name: DATABASE_URL
Value: postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public
Environments: ☑ Production ☑ Preview ☑ Development
```

#### 2. Odoo (si configuré)
```
Name: NEXT_PUBLIC_ODOO_URL
Value: https://votre-odoo.com
Environments: ☑ Production ☑ Preview ☑ Development
```

```
Name: NEXT_PUBLIC_ODOO_DB
Value: votre_base
Environments: ☑ Production ☑ Preview ☑ Development
```

```
Name: NEXT_PUBLIC_ODOO_USERNAME
Value: votre_utilisateur
Environments: ☑ Production ☑ Preview ☑ Development
```

```
Name: NEXT_PUBLIC_ODOO_PASSWORD
Value: votre_mot_de_passe
Environments: ☑ Production ☑ Preview ☑ Development
```

```
Name: ODOO_API_KEY
Value: votre_cle_api
Environments: ☑ Production ☑ Preview ☑ Development
```

#### 3. Admin Password
```
Name: ADMIN_PASSWORD
Value: votre_mot_de_passe_admin_securise
Environments: ☑ Production ☑ Preview ☑ Development
```

#### 4. Resend (pour le formulaire de contact)
```
Name: RESEND_API_KEY
Value: re_h544tgd3_6p7U7ZSynxkGPiQF4zu4zmFQ
Environments: ☑ Production ☑ Preview ☑ Development
```

```
Name: CONTACT_EMAIL
Value: hello@inkoo.eu
Environments: ☑ Production ☑ Preview ☑ Development
```

**Note :** Pour utiliser votre propre domaine d'envoi dans Resend :
1. Allez sur https://resend.com/domains
2. Ajoutez et vérifiez votre domaine (ex: inkoo.eu)
3. Ajoutez la variable `RESEND_FROM_EMAIL` avec votre adresse vérifiée (ex: noreply@inkoo.eu)

#### 5. Environment
```
Name: NODE_ENV
Value: production
Environments: ☑ Production
```

## 🚀 Étape 5 : Déployer

1. Cliquez sur **Deploy**
2. Attendez 2-3 minutes pendant le build
3. Vercel va automatiquement :
   - Installer les dépendances
   - Générer Prisma Client
   - Appliquer les migrations PostgreSQL
   - Builder l'application Next.js

## ✅ Étape 6 : Vérifier le déploiement

Une fois le déploiement terminé :

1. Votre application sera accessible à : `https://inkoopro.vercel.app` (ou un nom similaire)
2. Testez l'application :
   - Page d'accueil
   - Interface admin : `https://votre-app.vercel.app/admin/login`
3. Vérifiez les logs si nécessaire :
   - Allez dans **Deployments** > Cliquez sur le dernier déploiement > **Logs**

## 🔧 Étape 7 : Configuration post-déploiement

### Initialiser les données par défaut

1. Connectez-vous à l'admin : `https://votre-app.vercel.app/admin/login`
2. Allez dans **Techniques** > **Mapping Odoo**
3. Configurez les mappings des services vers Odoo
4. Allez dans **Techniques** > **Prix des services**
5. Configurez les prix
6. Allez dans **Facteurs de prix**
7. Configurez les facteurs

## 🔄 Déploiements automatiques

Désormais, à chaque fois que vous poussez du code sur GitHub :

```bash
git add .
git commit -m "Description des changements"
git push
```

Vercel déploiera automatiquement une nouvelle version !

## 📋 Checklist de déploiement

- [x] Code sur GitHub
- [ ] Projet créé sur Vercel
- [ ] Variables d'environnement ajoutées
- [ ] Déploiement réussi
- [ ] Application accessible
- [ ] Données initiales configurées

## 🆘 Dépannage

### Erreur : "Build failed"
- Vérifiez les logs dans Vercel
- Vérifiez que `DATABASE_URL` est correcte
- Vérifiez que le schéma Prisma utilise `provider = "postgresql"`

### Erreur : "Migration failed"
- Vérifiez que la base Supabase est accessible
- Vérifiez que le mot de passe est correct (avec `%21` pour le `!`)

### Erreur : "Prisma Client not generated"
- C'est normal, `vercel.json` le gère automatiquement

## 🎉 C'est tout !

Votre application est maintenant en ligne !

