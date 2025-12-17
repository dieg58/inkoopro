# Configuration Odoo pour INKOO PRO

Ce document explique comment configurer Odoo pour synchroniser les produits avec INKOO PRO.

## Configuration de base

### Variables d'environnement

Ajoutez dans votre fichier `.env.local` :

#### Option 1 : Authentification par clé API (Recommandée)

```env
NEXT_PUBLIC_ODOO_URL=https://votre-odoo.com
NEXT_PUBLIC_ODOO_DB=votre_base_de_donnees
ODOO_API_KEY=votre_cle_api_odoo
```

**Comment créer une clé API dans Odoo :**
1. Allez dans **Paramètres > Utilisateurs et entreprises > Utilisateurs**
2. Sélectionnez votre utilisateur
3. Allez dans l'onglet **Accès aux droits**
4. Créez une nouvelle clé API dans la section appropriée
5. Copiez la clé générée dans votre `.env.local`

#### Option 2 : Authentification par nom d'utilisateur/mot de passe

```env
NEXT_PUBLIC_ODOO_URL=https://votre-odoo.com
NEXT_PUBLIC_ODOO_DB=votre_base_de_donnees
NEXT_PUBLIC_ODOO_USERNAME=votre_utilisateur
NEXT_PUBLIC_ODOO_PASSWORD=votre_mot_de_passe
```

**Note :** La clé API est plus sécurisée et recommandée pour les intégrations. Si vous utilisez une clé API, vous n'avez pas besoin de USERNAME et PASSWORD.

## Mapping des produits

### Champs Odoo utilisés

L'application récupère les produits depuis le modèle `product.product` avec les champs suivants :

- `id` : Identifiant du produit
- `name` : Nom du produit
- `description` : Description (utilisé comme description de vente)
- `description_sale` : Description de vente (prioritaire si disponible)
- `list_price` : Prix de vente
- `categ_id` : Catégorie du produit (pour déterminer le type : tshirt, polo, etc.)
- `sale_ok` : Doit être `True` pour que le produit soit visible

### Catégories de produits

Les catégories sont mappées automatiquement selon le nom de la catégorie Odoo :

- **T-shirt** : Si le nom de catégorie contient "t-shirt" ou "tshirt"
- **Polo** : Si le nom de catégorie contient "polo"
- **Sweat** : Si le nom de catégorie contient "sweat"
- **Casquette** : Si le nom de catégorie contient "casquette"
- **Autre** : Par défaut

### Tailles et couleurs

Par défaut, l'application utilise des valeurs par défaut :
- **Tailles** : S, M, L, XL, 2XL
- **Couleurs** : Blanc, Noir

#### Option 1 : Champs personnalisés (Recommandé)

Créez des champs personnalisés dans Odoo pour les tailles et couleurs :

1. Allez dans **Paramètres > Technique > Base de données > Champs**
2. Créez deux nouveaux champs Many2many :
   - `x_available_sizes` : Lié à un modèle `product.size` (ou similaire)
   - `x_available_colors` : Lié à un modèle `product.color` (ou similaire)

3. Modifiez `lib/odoo-products.ts` pour utiliser ces champs :

```typescript
// Dans la fonction getProductsFromOdoo, ajoutez dans les champs à récupérer :
'x_available_sizes',
'x_available_colors',

// Puis dans le mapping :
const availableSizes: ProductSize[] = odooProduct.x_available_sizes
  ? odooProduct.x_available_sizes.map((s: any) => s.name as ProductSize)
  : ['S', 'M', 'L', 'XL']

const availableColors: string[] = odooProduct.x_available_colors
  ? odooProduct.x_available_colors.map((c: any) => c.name)
  : ['Blanc', 'Noir']
```

#### Option 2 : Champs texte (Simple)

Créez des champs texte dans Odoo :

1. Créez deux champs Char :
   - `x_available_sizes` : Texte avec les tailles séparées par des virgules (ex: "S,M,L,XL,2XL")
   - `x_available_colors` : Texte avec les couleurs séparées par des virgules (ex: "Blanc,Noir,Bleu,Rouge")

2. Modifiez `lib/odoo-products.ts` :

```typescript
const availableSizes: ProductSize[] = odooProduct.x_available_sizes
  ? odooProduct.x_available_sizes.split(',').map((s: string) => s.trim() as ProductSize)
  : ['S', 'M', 'L', 'XL']

const availableColors: string[] = odooProduct.x_available_colors
  ? odooProduct.x_available_colors.split(',').map((c: string) => c.trim())
  : ['Blanc', 'Noir']
```

## Filtres des produits

Par défaut, l'application récupère tous les produits avec `sale_ok = True`.

Pour filtrer davantage, modifiez `lib/odoo-products.ts` dans la fonction `getProductsFromOdoo` :

```typescript
args: [
  [
    ['sale_ok', '=', true],
    ['categ_id', '=', categorie_id], // Filtrer par catégorie
    // Ajoutez d'autres filtres selon vos besoins
  ],
  // ...
]
```

## Test de la connexion

Pour tester la connexion Odoo :

1. Vérifiez que les variables d'environnement sont correctes
2. Accédez à `/api/products` dans votre navigateur
3. Vous devriez voir la liste des produits au format JSON

## Dépannage

### Aucun produit n'est retourné

1. Vérifiez que `sale_ok` est bien à `True` dans Odoo
2. Vérifiez les identifiants de connexion
3. Vérifiez que l'URL Odoo est accessible depuis votre serveur
4. Consultez les logs du serveur pour voir les erreurs

### Erreur d'authentification

1. Vérifiez que l'utilisateur Odoo a les droits nécessaires
2. Vérifiez que le mot de passe est correct
3. Vérifiez que la base de données est correcte

