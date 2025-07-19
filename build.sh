#!/bin/bash

# Build script for SignTusk Next.js app
set -e  # Exit on any error

echo "🚀 Starting SignTusk build process..."

# Check Node.js version
echo "📋 Checking Node.js version..."
node --version
npm --version

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run build
echo "🔨 Building application..."
npm run build

echo "✅ Build completed successfully!"