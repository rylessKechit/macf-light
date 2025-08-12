/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Configuration pour les uploads de fichiers
  serverRuntimeConfig: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  publicRuntimeConfig: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
}

module.exports = nextConfig