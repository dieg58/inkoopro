const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Optimisations de performance
  compress: true, // Compression gzip
  poweredByHeader: false, // Retirer le header X-Powered-By pour la sécurité
  
  // Optimisations des images (si vous utilisez next/image)
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Optimisations de compilation
  swcMinify: true, // Utiliser SWC pour minifier (plus rapide que Terser)
  
  // Désactiver le prerendering pour les routes dynamiques
  // Les pages qui utilisent des cookies ou des données dynamiques ne peuvent pas être pré-rendues
  experimental: {
    // Désactiver le prerendering automatique pour éviter les erreurs avec les cookies
    isrMemoryCacheSize: 0, // Désactiver le cache ISR
  },
}

module.exports = withNextIntl(nextConfig)

