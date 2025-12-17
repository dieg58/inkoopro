# 🚀 Configuration Git pour Vercel

## Étape 1 : Initialiser Git (si pas déjà fait)

```bash
# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Ready for production"
```

## Étape 2 : Créer un repository sur GitHub

1. Allez sur https://github.com
2. Cliquez sur **New repository** (ou le bouton **+** en haut à droite)
3. Donnez un nom à votre repository (ex: `inkoo-pro`)
4. **Ne cochez PAS** "Initialize with README" (vous avez déjà des fichiers)
5. Cliquez sur **Create repository**

## Étape 3 : Connecter votre projet local à GitHub

GitHub vous donnera des commandes, mais voici les commandes à exécuter :

```bash
# Ajouter le remote GitHub (remplacez USERNAME et REPO_NAME)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Renommer la branche principale en 'main' (si nécessaire)
git branch -M main

# Pousser le code sur GitHub
git push -u origin main
```

**Exemple** :
```bash
git remote add origin https://github.com/diegozambrano/inkoo-pro.git
git branch -M main
git push -u origin main
```

## Étape 4 : Vérifier que tout est bien poussé

1. Allez sur votre repository GitHub
2. Vous devriez voir tous vos fichiers

## Étape 5 : Déployer sur Vercel

Maintenant que votre code est sur GitHub :

1. Allez sur https://vercel.com/new
2. Cliquez sur **Import Git Repository**
3. Autorisez Vercel à accéder à GitHub (si demandé)
4. Sélectionnez votre repository `inkoo-pro`
5. Cliquez sur **Import**

Vercel va automatiquement :
- Détecter Next.js
- Utiliser la configuration de `vercel.json`
- Demander les variables d'environnement

## ⚠️ Important : Ne commitez PAS ces fichiers

Ces fichiers contiennent des informations sensibles et sont déjà dans `.gitignore` :
- `.env.local` (contient vos mots de passe)
- `DATABASE_URL.txt` (contient votre mot de passe DB)
- `node_modules/`
- `.next/`

## Commandes Git utiles

```bash
# Voir l'état des fichiers
git status

# Ajouter des fichiers modifiés
git add .

# Commit avec un message
git commit -m "Description des changements"

# Pousser vers GitHub
git push

# Voir l'historique
git log --oneline
```

## Checklist avant de pousser

- [ ] `.env.local` est dans `.gitignore` ✅ (déjà fait)
- [ ] `DATABASE_URL.txt` est dans `.gitignore` ✅ (déjà fait)
- [ ] Tous les fichiers sont commités
- [ ] Le code est poussé sur GitHub
- [ ] Le repository est public ou vous avez autorisé Vercel

## Problèmes courants

### Erreur : "fatal: not a git repository"
→ Exécutez `git init` d'abord

### Erreur : "remote origin already exists"
→ Votre projet est déjà connecté à un remote. Vérifiez avec `git remote -v`

### Erreur : "authentication failed"
→ Vous devez vous authentifier avec GitHub. Utilisez un Personal Access Token ou SSH.

