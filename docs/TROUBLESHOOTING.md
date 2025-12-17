# Guide de dépannage - INKOO PRO

## Problème : "Aucun produit trouvé dans Odoo"

Si vous voyez ce message, voici les étapes pour diagnostiquer et résoudre le problème :

### 1. Vérifier la connexion Odoo

1. Allez dans l'interface admin : `/admin`
2. Cliquez sur le bouton **"Tester Odoo"**
3. Vérifiez les logs dans la console du serveur (terminal où vous avez lancé `npm run dev`)

### 2. Vérifier les variables d'environnement

Assurez-vous que votre fichier `.env.local` contient les bonnes valeurs :

```env
NEXT_PUBLIC_ODOO_URL=https://votre-odoo.com
NEXT_PUBLIC_ODOO_DB=votre_base_de_donnees
NEXT_PUBLIC_ODOO_USERNAME=votre_utilisateur
NEXT_PUBLIC_ODOO_PASSWORD=votre_mot_de_passe
```

**Important :** Après modification de `.env.local`, redémarrez le serveur :
```bash
# Arrêtez le serveur (Ctrl+C) puis relancez :
npm run dev
```

### 3. Vérifier les produits dans Odoo

#### Problème : Le filtre `sale_ok = True` est trop restrictif

Si vos produits dans Odoo n'ont pas le champ `sale_ok` activé, modifiez le fichier `lib/odoo-products.ts` :

**Option A : Utiliser le filtre `active` au lieu de `sale_ok`**

```typescript
args: [
  [
    ['active', '=', true], // Produits actifs uniquement
  ],
```

**Option B : Retirer tous les filtres (tous les produits)**

```typescript
args: [
  [], // Pas de filtre
],
```

**Option C : Filtrer par catégorie**

```typescript
args: [
  [
    ['categ_id', '=', votre_categorie_id], // Remplacez par l'ID de votre catégorie
  ],
],
```

#### Vérifier dans Odoo

1. Connectez-vous à votre Odoo
2. Allez dans **Ventes > Produits > Produits**
3. Vérifiez que :
   - Les produits existent
   - Le champ "Vendable" (`sale_ok`) est coché (si vous utilisez ce filtre)
   - Les produits sont actifs

### 4. Vérifier les droits d'accès

L'utilisateur Odoo utilisé doit avoir les droits de lecture sur le modèle `product.product` :

1. Dans Odoo, allez dans **Paramètres > Utilisateurs et entreprises > Utilisateurs**
2. Sélectionnez l'utilisateur utilisé pour la connexion
3. Vérifiez qu'il a les droits :
   - **Ventes** : Accès aux produits
   - **Stock** : Accès aux produits (si applicable)

### 5. Vérifier le modèle de produits

Par défaut, l'application utilise le modèle `product.product`. Si vous utilisez un autre modèle (comme `product.template`), modifiez dans `lib/odoo-products.ts` :

```typescript
model: 'product.template', // Au lieu de 'product.product'
```

### 6. Consulter les logs

Les logs détaillés sont affichés dans la console du serveur. Recherchez :

- `Authentification Odoo réussie` : La connexion fonctionne
- `Réponse Odoo:` : Affiche le nombre de produits retournés
- `Aucun produit retourné par Odoo` : Aucun produit ne correspond aux filtres

### 7. Tester avec une requête simple

Pour tester si la connexion fonctionne, vous pouvez temporairement modifier `lib/odoo-products.ts` pour récupérer tous les produits sans filtre :

```typescript
args: [
  [], // Pas de filtre - récupère tous les produits
],
```

Si cela fonctionne, le problème vient du filtre. Si cela ne fonctionne toujours pas, le problème vient de la connexion ou des droits d'accès.

### 8. Vérifier l'URL Odoo

Assurez-vous que l'URL Odoo est correcte :
- Format : `https://votre-domaine.com` ou `https://votre-domaine.odoo.com`
- Pas de slash à la fin
- Accessible depuis votre serveur

### 9. Tester l'API Odoo directement

Vous pouvez tester la connexion Odoo directement avec curl :

```bash
curl -X POST https://votre-odoo.com/web/session/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "call",
    "params": {
      "db": "votre_base",
      "login": "votre_user",
      "password": "votre_password"
    }
  }'
```

Si cela retourne une erreur, le problème vient de la configuration Odoo ou des identifiants.

## Autres problèmes courants

### Erreur d'authentification

- Vérifiez que le nom d'utilisateur et le mot de passe sont corrects
- Vérifiez que la base de données est correcte
- Vérifiez que l'utilisateur existe et est actif dans Odoo

### Erreur de connexion réseau

- Vérifiez que l'URL Odoo est accessible
- Vérifiez les paramètres de pare-feu
- Vérifiez que vous n'êtes pas bloqué par CORS (si Odoo est sur un autre domaine)

## Besoin d'aide ?

Si le problème persiste :
1. Consultez les logs du serveur (terminal)
2. Vérifiez les logs dans la console du navigateur (F12)
3. Testez la connexion avec le bouton "Tester Odoo" dans l'admin

