/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      // Supabase storage domain — แก้ให้ตรงกับ project ของคุณ
      'xxxxxxxxxxxx.supabase.co',
    ],
  },
}

module.exports = nextConfig
