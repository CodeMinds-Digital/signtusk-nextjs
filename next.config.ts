import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporarily disable static export for development
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,

  // Fix cross-origin issues in development
  allowedDevOrigins: [
    '192.168.1.4:3000',
    'localhost:3000',
    '127.0.0.1:3000',
    '0.0.0.0:3000'
  ],

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    unoptimized: process.env.NODE_ENV === 'production', // Required for static export
  },

  // Enable compression
  compress: true,

  // Configure trailing slash for static export
  trailingSlash: process.env.NODE_ENV === 'production',
  skipTrailingSlashRedirect: process.env.NODE_ENV === 'production',
};

export default nextConfig;