# Alternatives de Synchronisation des Produits

Plusieurs méthodes sont disponibles pour synchroniser les produits depuis Odoo, chacune avec ses avantages :

## 1. Synchronisation Progressive (Actuelle) ✅

**Méthode** : Synchronisation par lots de 200 produits via l'interface admin

**Avantages** :
- Fonctionne avec Vercel gratuit
- Contrôle manuel
- Progression visible

**Inconvénients** :
- Nécessite plusieurs clics
- Prend du temps

**Utilisation** : Cliquez sur "Synchroniser" dans l'interface admin

---

## 2. Vercel Cron Jobs (Recommandé) ⭐

**Méthode** : Synchronisation automatique programmée via Vercel Cron

**Avantages** :
- Automatique (pas besoin d'intervention)
- Gratuit sur Vercel
- Synchronisation régulière (toutes les 6 heures par défaut)

**Configuration** :
1. Ajoutez `CRON_SECRET` dans les variables d'environnement Vercel (un secret aléatoire)
2. Le cron job est déjà configuré dans `vercel.json` pour s'exécuter toutes les 6 heures
3. Vous pouvez modifier la fréquence dans `vercel.json` :
   - `"0 */6 * * *"` = toutes les 6 heures
   - `"0 0 * * *"` = une fois par jour à minuit
   - `"0 */2 * * *"` = toutes les 2 heures

**Utilisation** : Automatique, pas d'action requise

---

## 3. Webhook depuis Odoo (Idéal pour synchronisation en temps réel)

**Méthode** : Odoo appelle votre API quand les produits changent

**Avantages** :
- Synchronisation en temps réel
- Efficace (seulement les produits modifiés)
- Pas de timeout

**Configuration** :
1. Dans Odoo, créez un webhook qui appelle :
   ```
   POST https://pro.inkoo.eu/api/products/sync/webhook
   ```
2. Créez la route `/api/products/sync/webhook` qui synchronise uniquement les produits modifiés

**Utilisation** : Automatique quand Odoo détecte un changement

---

## 4. Script Externe (Pour synchronisation complète)

**Méthode** : Script qui tourne sur un serveur externe (GitHub Actions, Railway, etc.)

**Avantages** :
- Pas de limite de timeout
- Peut synchroniser tous les produits d'un coup
- Flexible

**Exemple avec GitHub Actions** :
```yaml
name: Sync Products
on:
  schedule:
    - cron: '0 */6 * * *'  # Toutes les 6 heures
  workflow_dispatch:  # Déclenchement manuel

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Products
        run: |
          curl -X POST https://pro.inkoo.eu/api/products/sync \
            -H "Content-Type: application/json" \
            -d '{"forceRefresh": true}'
```

---

## 5. Synchronisation Manuelle par API

**Méthode** : Appel direct de l'API avec curl ou Postman

**Avantages** :
- Contrôle total
- Peut être automatisé avec un script local

**Utilisation** :
```bash
curl -X POST https://pro.inkoo.eu/api/products/sync \
  -H "Content-Type: application/json" \
  -d '{"forceRefresh": true, "limit": 500}'
```

---

## Recommandation

Pour Vercel gratuit, je recommande :
1. **Vercel Cron Jobs** pour la synchronisation automatique régulière
2. **Synchronisation progressive** pour les synchronisations manuelles complètes
3. **Webhook Odoo** si vous avez besoin de synchronisation en temps réel

La solution actuelle (synchronisation progressive) fonctionne bien, mais le Cron Job est plus pratique pour une synchronisation automatique.

