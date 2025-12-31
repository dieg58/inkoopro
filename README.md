# INKOO PRO - Interface de devis en ligne

Application web permettant aux clients professionnels de créer des devis pour impression et broderie textile, avec intégration Odoo.

## Fonctionnalités

1. **Sélection de produits** : Choix des produits avec tailles et quantités par couleur
2. **Choix de la technique** : Sérigraphie, Broderie, ou DTF
3. **Options par technique** : Configuration des options spécifiques (nombre de couleurs, points, etc.)
4. **Position du marquage** : Sélection de la position sur le produit
5. **Gestion du devis** : Panier avec tous les articles
6. **Livraison** : Choix entre livraison ou retrait sur place
7. **Délai** : Sélection du délai de livraison
8. **Informations client** : Formulaire pour les informations du client
9. **Envoi vers Odoo** : Intégration automatique avec Odoo

## Technologies

- **Next.js 14** avec App Router
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** pour les composants UI
- **React Hook Form** pour la gestion des formulaires

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer les variables d'environnement :
Créer un fichier `.env.local` à la racine du projet :
```
# Base de données (SQLite pour développement local)
DATABASE_URL="file:./prisma/dev.db"

# Configuration Odoo
NEXT_PUBLIC_ODOO_URL=https://votre-odoo.com
NEXT_PUBLIC_ODOO_DB=votre_base_de_donnees
NEXT_PUBLIC_ODOO_USERNAME=votre_utilisateur
NEXT_PUBLIC_ODOO_PASSWORD=votre_mot_de_passe

# Mot de passe admin (à changer absolument en production)
ADMIN_PASSWORD=votre_mot_de_passe_admin_securise

# Resend (pour le formulaire de contact)
RESEND_API_KEY=re_h544tgd3_6p7U7ZSynxkGPiQF4zu4zmFQ
CONTACT_EMAIL=hello@inkoo.eu
RESEND_FROM_EMAIL=onboarding@resend.dev  # Utiliser votre domaine vérifié dans Resend
```

**⚠️ Important** : Changez le mot de passe admin par défaut (`admin123`) en production !

3. Configurer Prisma pour le développement local (SQLite) :
```bash
npm run setup:local
```

Cette commande configure automatiquement Prisma pour utiliser SQLite en local.

4. Lancer le serveur de développement :
```bash
npm run dev
```

5. Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

**Note :** Pour revenir à la configuration PostgreSQL (production), exécutez :
```bash
npm run setup:prod
```

## Configuration Odoo

L'intégration avec Odoo nécessite :
- Une URL d'accès à votre instance Odoo
- Les identifiants d'authentification
- L'accès au modèle `sale.order` pour créer les devis

### Format des données envoyées à Odoo

Le devis est transformé en commande Odoo avec :
- Les lignes de commande (`order_line`) pour chaque article
- Les informations de livraison dans les notes
- Les informations client
- Le délai de livraison

## Structure du projet

```
├── app/
│   ├── api/quote/        # API route pour l'envoi vers Odoo
│   ├── layout.tsx        # Layout principal
│   ├── page.tsx          # Page principale avec le workflow
│   └── globals.css       # Styles globaux
├── components/
│   ├── ui/               # Composants shadcn/ui
│   └── quote/            # Composants spécifiques au devis
├── lib/
│   ├── data.ts          # Données de produits et techniques
│   ├── odoo.ts          # Fonctions d'intégration Odoo
│   └── utils.ts         # Utilitaires
└── types/
    └── index.ts         # Types TypeScript
```

## Accès Administration

Un panneau d'administration est disponible à l'adresse `/admin/login`.

**Mot de passe par défaut** : `admin123` (⚠️ À changer absolument en production !)

Le panneau d'administration permet de :
- Gérer les produits (ajouter, modifier, supprimer)
- Configurer les techniques et leurs options
- Consulter les devis envoyés depuis l'interface client

Pour changer le mot de passe admin, définissez la variable d'environnement `ADMIN_PASSWORD` dans votre fichier `.env.local`.

## Personnalisation

### Ajouter des produits

Modifier le fichier `lib/data.ts` pour ajouter vos produits :

```typescript
export const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'Votre produit',
    description: 'Description',
    availableSizes: ['S', 'M', 'L'],
    availableColors: ['Blanc', 'Noir'],
  },
  // ...
]
```

### Modifier les options de techniques

Modifier `techniqueConfig` dans `lib/data.ts` pour ajuster les limites et options.

## Déploiement

1. Build de production :
```bash
npm run build
```

2. Lancer en production :
```bash
npm start
```

Pour un déploiement sur Vercel, Netlify ou autre plateforme, suivre leurs instructions de déploiement pour Next.js.

## Notes importantes

- L'intégration Odoo nécessite que votre instance soit accessible depuis le serveur Next.js
- Pour la production, utilisez des variables d'environnement sécurisées
- Adaptez le mapping des produits avec vos produits Odoo dans `lib/odoo.ts`
- Personnalisez le calcul des prix selon votre logique métier

