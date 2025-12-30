# Calcul de distance pour le coursier

## Système actuel

Le système utilise deux méthodes pour calculer la distance :

### 1. Google Distance Matrix API (recommandé)

**Avantages :**
- ✅ Distance routière réelle (prend en compte les routes)
- ✅ Plus précis pour les itinéraires
- ✅ Temps de trajet disponible

**Configuration :**
Ajouter dans `.env` :
```
GOOGLE_MAPS_API_KEY=votre_clé_api_google
```

**Coûts :**
- Gratuit jusqu'à 40 000 requêtes/mois
- Puis $5.00 par 1000 requêtes supplémentaires

### 2. OpenStreetMap Nominatim + Haversine (fallback gratuit)

**Avantages :**
- ✅ Gratuit, sans clé API
- ✅ Pas de limites strictes (respecter la politique d'usage)

**Inconvénients :**
- ⚠️ Distance à vol d'oiseau (pas de distance routière)
- ⚠️ Moins précis pour les calculs réels

**Note :** Si Google Maps API n'est pas configuré, le système utilisera automatiquement cette méthode.

## Liste des pays disponibles

Les pays suivants sont disponibles dans le sélecteur :
- Belgique (BE)
- France (FR)
- UK (GB)
- Espagne (ES)
- Pays-Bas (NL)
- Allemagne (DE)
- Suisse (CH)
- Luxembourg (LU)

## Comment ça fonctionne

1. Le système essaie d'abord d'utiliser Google Distance Matrix API
2. Si la clé API n'est pas configurée ou en cas d'erreur, il utilise OpenStreetMap + Haversine
3. La distance est calculée entre l'entrepôt (3 Rue de la maîtrise, 1400 Nivelles, BE) et l'adresse de livraison
4. Le prix est calculé : `max(distance × prix/km, forfait minimum)`

## Configuration Google Maps API

1. Créer un projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activer l'API "Distance Matrix API"
3. Créer une clé API
4. Ajouter la clé dans `.env` :
   ```
   GOOGLE_MAPS_API_KEY=votre_clé_api
   ```

