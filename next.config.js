/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gunakan tsconfig.server.json agar Next.js tidak compile
  // file Plasmo/Chrome extension (background.ts, contents/*, popup.tsx)
  typescript: {
    tsconfigPath: "./tsconfig.server.json"
  }
}

module.exports = nextConfig
