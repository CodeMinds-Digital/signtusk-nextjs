#!/bin/bash

# Script to run ESLint with --fix only on the files we've modified
# This avoids running ESLint on all files, which would generate many errors and warnings

echo "Running ESLint fix on modified files..."

npx eslint --fix \
  src/components/Dashboard.tsx \
  src/contexts/WalletContext.tsx \
  src/components/LoginFlow.tsx \
  src/app/dashboard/page.tsx

echo "ESLint fix completed!"