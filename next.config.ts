import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static export to allow API routes to work in production
  // output: 'export', // Commented out to enable server-side functionality
  
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
    // unoptimized: true, // Only needed for static export
  },
  
  // Enable compression
  compress: true,
  
  // Configure for server deployment
  // trailingSlash: false, // Default behavior for server deployment
  // skipTrailingSlashRedirect: false, // Default behavior for server deployment
};

export default nextConfig;