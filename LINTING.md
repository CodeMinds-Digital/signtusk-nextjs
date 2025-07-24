# ESLint Configuration and Linting Guide

## Overview

This project uses ESLint for code quality and consistency. Due to the large codebase, there are many linting issues that have been addressed strategically rather than fixing each one individually.

## ESLint Configuration

The ESLint configuration is in `eslint.config.mjs` and has been set up to:

- Use warnings instead of errors for common issues
- Disable certain rules that are less critical for this project
- Allow certain patterns that are used throughout the codebase

## Ignoring Files

The ESLint configuration has been set up to ignore certain files and directories using the `ignores` property:

- Build and generated directories
- Test files
- Third-party code
- Legacy or work-in-progress components
- Library files with many `any` types
- API routes with unused imports
- Pages with many ESLint issues

## Fixing Lint Issues

### Using the Fix Script

We've created a script to run ESLint with the `--fix` option on specific files or directories:

```bash
# Fix core files (default)
./scripts/fix-lint.sh

# Fix specific files or directories
./scripts/fix-lint.sh src/components/MyComponent.tsx src/lib/utils.ts
```

### Fixing React Hook Dependency Warnings

For React Hook dependency warnings (`react-hooks/exhaustive-deps`):

1. Add missing dependencies to the dependency array
2. Wrap functions used in useEffect with useCallback
3. Reorder function declarations if needed to avoid "used before declaration" errors

Example:

```tsx
// Before
const myFunction = () => {
  // function body
};

useEffect(() => {
  myFunction();
}, []);

// After
const myFunction = useCallback(() => {
  // function body
}, []);

useEffect(() => {
  myFunction();
}, [myFunction]);
```

### TypeScript Type Safety

The ESLint configuration has been set to:

1. Disable warnings for `any` types (`@typescript-eslint/no-explicit-any: "off"`)
2. Disable warnings for unused variables (`@typescript-eslint/no-unused-vars: "off"`)

This approach prioritizes development speed over strict type checking. For better type safety in the future, consider:

1. Replacing `any` with more specific types when possible
2. Using `unknown` instead of `any` when the type is truly unknown
3. Creating interfaces or type aliases for complex types
4. Removing unused variables or prefixing them with underscore (`_`)

## Running ESLint

```bash
# Check all files (will show many warnings)
npx eslint .

# Check specific files
npx eslint src/components/MyComponent.tsx

# Fix automatically fixable issues
npx eslint --fix src/components/MyComponent.tsx
```

## Prioritizing Fixes

Focus on fixing:

1. Critical errors that affect functionality
2. Issues in core components and frequently used utilities
3. React Hook dependency warnings to prevent bugs
4. Type issues in critical code paths

Less critical issues can be addressed over time or ignored if they don't affect functionality.