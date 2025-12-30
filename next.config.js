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
  
  // Expérimental: optimisations avancées
  // Désactivé car nécessite le module 'critters' qui n'est pas installé
  // experimental: {
  //   optimizeCss: true, // Optimiser le CSS
  // },
}

module.exports = withNextIntl(nextConfig)

