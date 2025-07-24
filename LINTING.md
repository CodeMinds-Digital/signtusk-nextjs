# Linting Guidelines for SignTusk

This document provides guidelines for handling linting in the SignTusk project.

## ESLint Configuration

The project uses ESLint with Next.js and TypeScript configurations. The configuration is defined in `eslint.config.mjs`.

## Linting Scripts

The following scripts are available for linting:

- `npm run lint`: Run ESLint on all TypeScript files
- `npm run lint:fix`: Run ESLint on all TypeScript files and automatically fix issues where possible
- `./scripts/fix-lint.sh`: Run ESLint with the --fix flag on specific core files
- `./scripts/fix-lint.sh [files/directories]`: Run ESLint with the --fix flag on specified files or directories

## Handling Linting Issues

The project has a large number of linting issues (errors and warnings). Here are some strategies for handling them:

### 1. Selective Fixing

Instead of trying to fix all linting issues at once, focus on fixing issues in the files you're actively working on. Use the `./scripts/fix-lint.sh` script to fix issues in specific files.

```bash
# Fix linting issues in a specific file
./scripts/fix-lint.sh src/components/MyComponent.tsx

# Fix linting issues in a specific directory
./scripts/fix-lint.sh src/lib/
```

### 2. Ignoring Files with Many Issues

Files with many linting issues are ignored in the ESLint configuration. If you're working on a file with many issues that isn't already ignored, you can add it to the `ignores` array in `eslint.config.mjs`.

### 3. Disabling Specific Rules

If a specific rule is causing many issues across the codebase, you can disable or downgrade it in the ESLint configuration. For example, to change an error to a warning:

```javascript
// In eslint.config.mjs
{
  rules: {
    "problematic-rule": "warn", // Changed from "error" to "warn"
  }
}
```

### 4. Inline Disabling

For specific instances where a linting rule doesn't make sense, you can disable it inline:

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  // Code that intentionally doesn't include all dependencies
}, [dependency1]);
```

## Best Practices

1. **Fix as You Go**: When modifying a file, try to fix linting issues in that file.
2. **Don't Introduce New Issues**: Ensure your changes don't introduce new linting issues.
3. **Commit Linting Fixes Separately**: When fixing linting issues, commit those changes separately from functional changes to keep the commit history clean.
4. **Document Intentional Rule Violations**: If you need to violate a linting rule for a good reason, add a comment explaining why.

## Gradual Improvement

The goal is to gradually improve the codebase's linting status over time, not to fix everything at once. Focus on making incremental improvements as you work on different parts of the codebase.