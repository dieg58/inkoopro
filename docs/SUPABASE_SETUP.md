# Configuration Supabase pour INKOO PRO

## Votre configuration Supabase

- **Host** : `db.dnbufjwancgdblsqrruv.supabase.co`
- **Port** : `5432`
- **Database** : `postgres`
- **User** : `postgres`
- **Password** : `tURLUTE58!`

## DATABASE_URL complète

```
postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public
```

**Note** : Le `!` est encodé en `%21` dans l'URL.

## Configuration locale (test)

### 1. Créer/modifier `.env.local`

```env
DATABASE_URL="postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public"
```

### 2. Vérifier le schéma Prisma

Assurez-vous que `prisma/schema.prisma` utilise PostgreSQL :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Générer le client Prisma

```bash
npx prisma generate
```

### 4. Appliquer les migrations

```bash
npx prisma migrate deploy
```

### 5. Tester la connexion

```bash
npx prisma studio
```

Cela ouvrira Prisma Studio dans votre navigateur pour visualiser votre base de données.

## Configuration Vercel (production)

### 1. Ajouter la variable d'environnement

Dans **Vercel > Settings > Environment Variables**, ajoutez :

- **Name** : `DATABASE_URL`
- **Value** : `postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public`
- **Environments** : Production, Preview, Development

### 2. Déployer

Vercel appliquera automatiquement les migrations lors du build grâce à `vercel.json`.

## Scripts utiles

### Configuration automatique

```bash
./scripts/setup-supabase.sh
```

Ce script :
- Vérifie la configuration
- Génère le client Prisma
- Teste la connexion
- Applique les migrations

### Test de connexion

```bash
./scripts/test-db-connection.sh
```

## Vérification dans Supabase

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Allez dans **Table Editor**
4. Vous devriez voir les tables créées par Prisma :
   - `Session`
   - `Client`
   - `Quote`
   - `ProductCache`
   - `ServicePricing`
   - `PricingConfig`
   - `ServiceOdooMapping`

## Dépannage

### Erreur : "password authentication failed"

- Vérifiez que le mot de passe est correct
- Assurez-vous que le `!` est encodé en `%21` dans l'URL

### Erreur : "connection refused"

- Vérifiez que votre IP n'est pas bloquée dans Supabase
- Allez dans **Settings > Database > Connection Pooling** dans Supabase
- Vérifiez les paramètres de sécurité

### Erreur : "schema does not exist"

- Ajoutez `?schema=public` à la fin de votre DATABASE_URL

## Sécurité Supabase

### Pooling de connexions (recommandé pour production)

Supabase recommande d'utiliser le connection pooling pour la production. L'URL serait :

```
postgresql://postgres.xxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?schema=public
```

Mais pour commencer, l'URL directe fonctionne aussi.

### Restrictions IP (optionnel)

Dans Supabase, vous pouvez restreindre les IPs autorisées :
1. Allez dans **Settings > Database**
2. Configurez les restrictions IP si nécessaire

## Support

- Documentation Supabase : https://supabase.com/docs
- Documentation Prisma : https://www.prisma.io/docs

