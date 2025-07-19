#!/bin/bash
set -e

echo "🚀 SignTusk Build Script"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Remove any yarn files
rm -f yarn.lock
rm -f .yarnrc

# Force npm usage
echo "📦 Installing dependencies with npm..."
npm install

echo "🔨 Building with Next.js..."
npm run build

echo "✅ Build completed successfully!"