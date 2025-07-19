# SignTusk Deployment Troubleshooting

## "Exited with status 1" Error Solutions

### 1. Check Render Build Logs
Look for specific error messages in the Render build logs. Common issues:

#### Memory Issues
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```
**Solution**: Add to render.yaml:
```yaml
envVars:
  - key: NODE_OPTIONS
    value: "--max-old-space-size=4096"
```

#### Dependency Issues
```
npm ERR! peer dep missing
```
**Solution**: Clear cache and reinstall:
```yaml
buildCommand: |
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install
  npm run build
```

#### TypeScript Errors
```
Type error: Cannot find module
```
**Solution**: Check all imports and types are correct.

### 2. Node.js Version Issues
Render might be using an incompatible Node.js version.

**Solution**: Add to render.yaml:
```yaml
envVars:
  - key: NODE_VERSION
    value: "18.17.0"
```

### 3. Build Command Variations to Try

#### Option 1: Basic (Current)
```yaml
buildCommand: npm install && npm run build
```

#### Option 2: With Cache Clear
```yaml
buildCommand: |
  npm cache clean --force
  npm install
  npm run build
```

#### Option 3: Using Yarn
```yaml
buildCommand: |
  npm install -g yarn
  yarn install
  yarn build
```

#### Option 4: Force Clean Install
```yaml
buildCommand: |
  rm -rf node_modules package-lock.json
  npm install
  npm run build
```

### 4. Environment Variables to Add

Add these to your Render service environment variables:

```
NODE_ENV=production
NPM_CONFIG_PRODUCTION=false
NODE_OPTIONS=--max-old-space-size=4096
NEXT_TELEMETRY_DISABLED=1
```

### 5. Alternative render.yaml Configurations

#### Minimal Configuration
```yaml
services:
  - type: web
    name: signtusk-nextjs
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
```

#### With Error Handling
```yaml
services:
  - type: web
    name: signtusk-nextjs
    env: node
    buildCommand: |
      set -e
      echo "Node: $(node --version)"
      echo "NPM: $(npm --version)"
      npm install
      npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

### 6. Manual Render Dashboard Configuration

If render.yaml doesn't work, configure manually:

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start`
3. **Environment**: Node
4. **Environment Variables**:
   - `NODE_ENV=production`
   - `NPM_CONFIG_PRODUCTION=false`

### 7. Check for Common Issues

#### Missing Dependencies
Ensure all dependencies are in package.json, not just devDependencies.

#### File Path Issues
Check that all imports use correct relative paths.

#### Environment-Specific Code
Remove any code that depends on local environment variables.

### 8. Test Locally First

Always test these commands locally:
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run build
npm start
```

### 9. Render Service Settings

In Render dashboard:
- **Auto-Deploy**: Yes
- **Branch**: main (or your default branch)
- **Root Directory**: Leave empty
- **Build Command**: Use render.yaml or manual config
- **Start Command**: `npm start`

### 10. Last Resort: Simplified Next.js Config

If all else fails, use minimal next.config.ts:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

## Getting Help

1. Check Render build logs for specific error messages
2. Compare with local build output
3. Try different build command variations
4. Contact Render support with specific error logs

## Current Status

✅ Local build works
✅ No TypeScript errors
✅ No ESLint errors
✅ All dependencies present

The issue is likely environment-specific on Render's servers.