/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gunakan tsconfig.server.json agar Next.js tidak compile
  // file Plasmo/Chrome extension (background.ts, contents/*, popup.tsx)
  typescript: {
    tsconfigPath: "./tsconfig.server.json"
  },
  // Trust reverse proxy headers (Nginx) untuk HTTPS detection
  async headers() {
    return []
  },
}

// Tell Next.js to trust X-Forwarded-Proto from Nginx
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'https://autofillstock.my.id'

module.exports = nextConfig
