# 📤 Pousser le code sur GitHub

## ✅ Étape 1 : Git est initialisé et commité

Votre code est maintenant prêt avec 2 commits :
1. Initial commit - Ready for production deployment
2. Remove database files from git and update .gitignore

## 📝 Étape 2 : Créer un repository sur GitHub

1. Allez sur **https://github.com**
2. Cliquez sur le bouton **+** en haut à droite
3. Sélectionnez **New repository**
4. Donnez un nom à votre repository (ex: `inkoo-pro`)
5. **Description** (optionnel) : "Application de devis INKOO PRO"
6. Choisissez **Public** ou **Private** (recommandé : Private)
7. **NE COCHEZ PAS** "Add a README file" (vous en avez déjà un)
8. **NE COCHEZ PAS** "Add .gitignore" (vous en avez déjà un)
9. Cliquez sur **Create repository**

## 🔗 Étape 3 : Connecter votre projet local à GitHub

GitHub vous donnera des instructions, mais voici les commandes :

```bash
# Ajouter le remote GitHub (remplacez USERNAME et REPO_NAME)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Exemple :
# git remote add origin https://github.com/diegozambrano/inkoo-pro.git
```

## 📤 Étape 4 : Pousser le code

```bash
# Renommer la branche en 'main' (si nécessaire)
git branch -M main

# Pousser le code sur GitHub
git push -u origin main
```

## 🔐 Authentification GitHub

Si GitHub vous demande de vous authentifier :

### Option 1 : Personal Access Token (recommandé)
1. Allez sur GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Créez un nouveau token avec les permissions `repo`
3. Utilisez ce token comme mot de passe lors du `git push`

### Option 2 : SSH (plus sécurisé)
1. Générez une clé SSH : `ssh-keygen -t ed25519 -C "votre_email@example.com"`
2. Ajoutez la clé à GitHub : Settings > SSH and GPG keys
3. Utilisez l'URL SSH : `git@github.com:USERNAME/REPO_NAME.git`

## ✅ Étape 5 : Vérifier

1. Allez sur votre repository GitHub
2. Vous devriez voir tous vos fichiers
3. Vérifiez que `dev.db` n'est **PAS** visible (il est dans .gitignore)

## 🚀 Étape 6 : Déployer sur Vercel

Maintenant que votre code est sur GitHub :

1. Allez sur **https://vercel.com/new**
2. Cliquez sur **Import Git Repository**
3. Autorisez Vercel à accéder à GitHub (si demandé)
4. Sélectionnez votre repository `inkoo-pro`
5. Cliquez sur **Import**

Vercel va automatiquement :
- ✅ Détecter Next.js
- ✅ Utiliser la configuration de `vercel.json`
- ✅ Vous demander les variables d'environnement

## 📋 Variables d'environnement à ajouter dans Vercel

Dans Vercel > Settings > Environment Variables, ajoutez :

```
DATABASE_URL=postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public
```

Et les autres variables (voir `CONFIG_VERCEL.md`)

## 🎉 C'est tout !

Votre application sera déployée automatiquement à chaque `git push` !

