#!/bin/bash

# Script to run ESLint with --fix on specific files or directories
# Usage: ./scripts/fix-lint.sh [files/directories]

# If no arguments are provided, run on these core files
if [ $# -eq 0 ]; then
  echo "Running ESLint fix on core files..."
  npx eslint --fix \
    src/contexts/WalletContext.tsx \
    src/components/Dashboard.tsx \
    src/components/LoginFlow.tsx \
    src/app/dashboard/ \
    src/app/login/ \
    src/app/signup/ \
    src/lib/storage.ts \
    src/lib/wallet.ts \
    src/lib/identity-consistency.ts
else
  echo "Running ESLint fix on specified files/directories..."
  npx eslint --fix "$@"
fi

echo "ESLint fix completed!"