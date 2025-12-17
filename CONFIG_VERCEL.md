# 🔐 Configuration Vercel - Variables d'environnement

## DATABASE_URL pour Vercel

Ajoutez cette variable dans **Vercel > Settings > Environment Variables** :

```
DATABASE_URL=postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public
```

**Important** : Le `!` est encodé en `%21` dans l'URL.

## Autres variables à ajouter

### Odoo (si configuré)
```
NEXT_PUBLIC_ODOO_URL=https://votre-odoo.com
NEXT_PUBLIC_ODOO_DB=votre_base
NEXT_PUBLIC_ODOO_USERNAME=votre_utilisateur
NEXT_PUBLIC_ODOO_PASSWORD=votre_mot_de_passe
ODOO_API_KEY=votre_cle_api
```

### Admin
```
ADMIN_PASSWORD=votre_mot_de_passe_admin_securise
```

### Environment
```
NODE_ENV=production
```

## Comment ajouter dans Vercel

1. Allez sur votre projet Vercel
2. Cliquez sur **Settings**
3. Cliquez sur **Environment Variables**
4. Ajoutez chaque variable :
   - **Name** : `DATABASE_URL`
   - **Value** : `postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public`
   - **Environment** : Sélectionnez `Production`, `Preview`, et `Development`
5. Cliquez sur **Save**

## Test local (optionnel)

Pour tester en local, créez/modifiez `.env.local` :

```env
DATABASE_URL="postgresql://postgres:tURLUTE58%21@db.dnbufjwancgdblsqrruv.supabase.co:5432/postgres?schema=public"
```

Puis testez :
```bash
npx prisma generate
npx prisma migrate deploy
```

