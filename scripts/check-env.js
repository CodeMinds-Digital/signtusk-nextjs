#!/usr/bin/env node

/**
 * Environment Variables Check Script
 * This script validates that all required environment variables are present
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

const optionalEnvVars = [
  'NODE_ENV',
  'NEXT_TELEMETRY_DISABLED',
  'PORT'
];

console.log('🔍 Checking environment variables...\n');

let hasErrors = false;

// Check required variables
console.log('📋 Required Variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: Missing`);
    hasErrors = true;
  } else {
    // Mask sensitive values
    const maskedValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? `${value.substring(0, 8)}...` 
      : value;
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

console.log('\n📋 Optional Variables:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: Not set (optional)`);
  }
});

if (hasErrors) {
  console.log('\n❌ Missing required environment variables!');
  console.log('\n📖 Please check the NETLIFY_DEPLOYMENT.md file for setup instructions.');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are present!');
  process.exit(0);
}