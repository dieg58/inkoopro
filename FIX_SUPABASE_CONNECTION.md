# 🔧 Correction : Connexion Supabase depuis Vercel

## ❌ Problème

Vercel ne peut pas se connecter à Supabase :
```
Error: P1001: Can't reach database server at `db.dnbufjwancgdblsqrruv.supabase.co:5432`
```

## ✅ Solutions

### Solution 1 : Vérifier la variable DATABASE_URL dans Vercel

1. Allez dans votre projet Vercel
2. Cliquez sur **Settings** > **Environment Variables**
3. Vérifiez que `DATABASE_URL` existe et est correcte
4. **Important** : Cochez bien les 3 environnements (Production, Preview, Development)

### Solution 2 : Utiliser le Connection Pooling de Supabase (RECOMMANDÉ)

Supabase recommande d'utiliser le **Connection Pooling** pour les applications serverless comme Vercel.

#### Étape 1 : Obtenir l'URL de pooling

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Allez dans **Settings** > **Database**
4. Trouvez la section **Connection Pooling**
5. Copiez l'URL de pooling (format : `postgresql://postgres.xxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`)

#### Étape 2 : Utiliser le port 6543 au lieu de 5432

L'URL de pooling utilise le port **6543** au lieu de **5432**.

**Format de l'URL de pooling** :
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Votre URL actuelle** (connexion directe) :
```
postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public
```

**URL de pooling à utiliser** (à obtenir depuis Supabase) :
```
postgresql://postgres.xxx:tURLUTE58%21@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public
```

### Solution 3 : Vérifier les restrictions IP dans Supabase

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Allez dans **Settings** > **Database**
4. Vérifiez la section **Network Restrictions**
5. Si des restrictions sont activées, désactivez-les temporairement ou ajoutez les IPs de Vercel

**Note** : Vercel utilise des IPs dynamiques, donc il est difficile de les whitelister. Le connection pooling est la meilleure solution.

### Solution 4 : Vérifier que Supabase est actif

1. Vérifiez que votre projet Supabase n'est pas en pause
2. Les projets gratuits peuvent être mis en pause après inactivité
3. Réveillez le projet si nécessaire

## 🔍 Comment trouver l'URL de pooling

### Méthode 1 : Interface Supabase

1. Allez dans **Settings** > **Database**
2. Scroll jusqu'à **Connection Pooling**
3. Vous verrez une URL comme :
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

### Méthode 2 : Depuis la connection string

Si vous avez la connection string normale, remplacez :
- `db.dnbufjwancgdblsqrruv.supabase.co` → `aws-0-eu-central-1.pooler.supabase.com`
- `:5432` → `:6543`
- Ajoutez `?pgbouncer=true` à la fin

## 📝 Configuration dans Vercel

Une fois que vous avez l'URL de pooling :

1. Allez dans **Vercel** > **Settings** > **Environment Variables**
2. Modifiez `DATABASE_URL` avec l'URL de pooling
3. Format :
   ```
   postgresql://postgres.xxx:tURLUTE58%21@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public
   ```
4. Sauvegardez
5. Redéployez (ou Vercel redéploiera automatiquement)

## ⚠️ Important : Paramètres de l'URL

L'URL de pooling doit inclure :
- `pgbouncer=true` (obligatoire pour le pooling)
- `schema=public` (pour spécifier le schéma)

## 🧪 Tester la connexion

Après avoir mis à jour la DATABASE_URL, redéployez. Le build devrait maintenant réussir.

## 📋 Checklist

- [ ] Variable `DATABASE_URL` configurée dans Vercel
- [ ] URL de pooling obtenue depuis Supabase
- [ ] Port 6543 utilisé (au lieu de 5432)
- [ ] Paramètre `pgbouncer=true` ajouté
- [ ] Restrictions IP désactivées dans Supabase (ou pooling utilisé)
- [ ] Projet Supabase actif (non en pause)
- [ ] Redéploiement effectué

## 🆘 Si ça ne fonctionne toujours pas

1. Vérifiez les logs Supabase pour voir les tentatives de connexion
2. Testez la connexion en local avec l'URL de pooling
3. Contactez le support Supabase si nécessaire

