# Comment voir les logs pour identifier les problèmes

## 1. Logs du serveur (Terminal)

Les logs les plus importants sont affichés dans le terminal où vous avez lancé le serveur de développement.

### Où les trouver :

1. **Ouvrez votre terminal** (celui où vous avez lancé `npm run dev`)
2. Les logs s'affichent en temps réel dans ce terminal

### Ce que vous verrez :

```
Authentification Odoo réussie, UID: 2
Requête Odoo: { ... }
Réponse Odoo: { hasResult: true, resultLength: 0, firstProduct: null }
Aucun produit retourné par Odoo. Vérifiez : ...
```

### Exemple de logs à rechercher :

- ✅ `Authentification Odoo réussie` → La connexion fonctionne
- ❌ `Échec de l'authentification Odoo` → Problème d'identifiants
- ✅ `Réponse Odoo: { resultLength: 10 }` → Produits trouvés
- ❌ `Réponse Odoo: { resultLength: 0 }` → Aucun produit trouvé
- ❌ `Erreur lors de la récupération des produits` → Erreur dans la requête

## 2. Logs du navigateur (Console du navigateur)

Les erreurs côté client sont affichées dans la console du navigateur.

### Comment les ouvrir :

1. **Chrome/Edge** : Appuyez sur `F12` ou `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
2. **Firefox** : Appuyez sur `F12` ou `Cmd+Option+K` (Mac) / `Ctrl+Shift+K` (Windows)
3. **Safari** : Activez d'abord le menu Développeur dans les préférences, puis `Cmd+Option+C`

### Où regarder :

- Onglet **Console** : Messages d'erreur JavaScript
- Onglet **Network** : Requêtes HTTP (vérifiez les appels à `/api/products`)

### Exemple de ce que vous verrez :

```
GET http://localhost:3000/api/products 200 OK
{ success: true, products: [], source: 'fallback' }
```

## 3. Logs de l'API (Route de test)

Utilisez la route de test pour voir les logs détaillés.

### Comment l'utiliser :

1. Allez dans l'interface admin : `http://localhost:3000/admin`
2. Cliquez sur le bouton **"Tester Odoo"**
3. Regardez le message affiché et les logs dans le terminal

### Ou testez directement dans le navigateur :

Ouvrez : `http://localhost:3000/api/admin/test-odoo`

Vous verrez une réponse JSON avec :
```json
{
  "success": true,
  "productCount": 0,
  "message": "Aucun produit trouvé. Vérifiez les logs du serveur..."
}
```

## 4. Logs détaillés avec plus d'informations

Pour activer des logs encore plus détaillés, vous pouvez modifier temporairement le code.

### Dans `lib/odoo-products.ts` :

Ajoutez des `console.log` supplémentaires :

```typescript
console.log('URL Odoo:', ODOO_URL)
console.log('Base de données:', ODOO_DB)
console.log('Utilisateur:', ODOO_USERNAME)
console.log('Réponse complète:', JSON.stringify(data, null, 2))
```

## 5. Vérifier les variables d'environnement

Pour vérifier que les variables sont bien chargées, ajoutez temporairement dans `lib/odoo-products.ts` :

```typescript
console.log('Variables d\'environnement:', {
  url: ODOO_URL ? 'Configuré' : 'Manquant',
  db: ODOO_DB ? 'Configuré' : 'Manquant',
  user: ODOO_USERNAME ? 'Configuré' : 'Manquant',
  hasPassword: !!ODOO_PASSWORD,
  hasApiKey: !!ODOO_API_KEY,
})
```

## 6. Logs des erreurs réseau

Si vous voyez des erreurs réseau dans la console du navigateur :

1. Ouvrez l'onglet **Network** dans les outils de développement
2. Rechargez la page
3. Cherchez la requête vers `/api/products`
4. Cliquez dessus pour voir :
   - **Headers** : Les en-têtes envoyés
   - **Response** : La réponse reçue
   - **Preview** : La réponse formatée

## 7. Exemple de diagnostic complet

Voici un exemple de ce que vous devriez voir dans les logs si tout fonctionne :

```
✅ Authentification Odoo réussie, UID: 2
✅ Requête Odoo: { jsonrpc: "2.0", method: "call", ... }
✅ Réponse Odoo: { hasResult: true, resultLength: 15, firstProduct: {...} }
✅ 15 produit(s) transformé(s) avec succès
```

Et si ça ne fonctionne pas :

```
❌ Échec de l'authentification Odoo
   → Vérifiez vos identifiants dans .env.local
```

ou

```
✅ Authentification Odoo réussie, UID: 2
❌ Réponse Odoo: { hasResult: true, resultLength: 0 }
   → Aucun produit retourné par Odoo
   → Vérifiez que les produits existent dans Odoo
```

## 8. Astuce : Redémarrer le serveur

**Important** : Après avoir modifié `.env.local`, vous DEVEZ redémarrer le serveur :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez :
npm run dev
```

Les variables d'environnement ne sont chargées qu'au démarrage du serveur.

## 9. Filtrer les logs

Pour voir uniquement les logs Odoo dans le terminal, vous pouvez utiliser `grep` :

```bash
npm run dev | grep -i "odoo"
```

Ou sur Windows PowerShell :
```powershell
npm run dev | Select-String -Pattern "odoo"
```

## Résumé rapide

1. **Terminal** → Logs serveur (le plus important)
2. **Console navigateur (F12)** → Erreurs client
3. **Onglet Network (F12)** → Requêtes HTTP
4. **Bouton "Tester Odoo"** → Test rapide avec retour détaillé

