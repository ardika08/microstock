/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: "./tsconfig.server.json"
  },
  // Allow Google profile images
  images: {
    domains: ['lh3.googleusercontent.com', 'lh4.googleusercontent.com', 'lh5.googleusercontent.com', 'lh6.googleusercontent.com'],
  },
  async headers() {
    return []
  },
}

process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'https://autofillstock.my.id'

module.exports = nextConfig
