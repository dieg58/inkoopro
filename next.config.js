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
  
  // Note: swcMinify est activé par défaut dans Next.js 16, plus besoin de le spécifier
}

module.exports = withNextIntl(nextConfig)

