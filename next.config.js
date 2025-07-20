/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for optimized deployment

  // Fix cross-origin issues in development
  allowedDevOrigins: [
    '192.168.1.4:3000',
    'localhost:3000',
    '127.0.0.1:3000',
    '0.0.0.0:3000'
  ],

  // Optimize images for production
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Enable compression
  compress: true,

  // Production optimizations
  poweredByHeader: false,

  // Ensure proper handling of trailing slashes
  trailingSlash: false,
};

module.exports = nextConfig;