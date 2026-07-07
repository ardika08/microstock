/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: "./tsconfig.server.json"
  },
  // Allow Google profile images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return []
  },
}

process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'https://autofillstock.my.id'

module.exports = nextConfig
