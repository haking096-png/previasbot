/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for production deployment
  output: 'standalone',

  // Suporte a variáveis de ambiente de runtime
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Headers CORS para API proxy
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Configurações de imagem para produção
  images: {
    domains: ['localhost', 'telegram-preview-bot.up.railway.app'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.up.railway.app',
      },
    ],
  },
};

module.exports = nextConfig;
