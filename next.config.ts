import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  output: 'export',
  // Enable compression
  compress: true,
};

export default nextConfig;


