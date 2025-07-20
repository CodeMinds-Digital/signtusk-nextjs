# Netlify Deployment Guide for SignTusk

## Environment Variables Setup

To deploy SignTusk on Netlify, you need to configure the following environment variables in your Netlify dashboard:

### Required Environment Variables

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: `https://kteameuzjwpeborspovn.supabase.co`
   - Description: Your Supabase project URL

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZWFtZXV6andwZWJvcnNwb3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTA2NDIsImV4cCI6MjA2ODMyNjY0Mn0.ZkJt7lhn3kRF-mJhkEPt-fygeQnpbL9Q6L6bb_gZG_Y`
   - Description: Supabase anonymous key for client-side operations

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZWFtZXV6andwZWJvcnNwb3ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc1MDY0MiwiZXhwIjoyMDY4MzI2NjQyfQ.8QA1vQDRe5WN4rbA4JIA3U_BAlTRLZ8epSUJrToVwMs`
   - Description: Supabase service role key for server-side operations

4. **JWT_SECRET**
   - Value: `your-super-secret-jwt-key-change-in-production`
   - Description: Secret key for JWT token signing
   - **⚠️ IMPORTANT**: Change this to a secure random string in production

5. **NODE_ENV**
   - Value: `production`
   - Description: Node environment setting

6. **NEXT_TELEMETRY_DISABLED**
   - Value: `1`
   - Description: Disables Next.js telemetry for faster builds

## How to Set Environment Variables in Netlify

1. **Go to your Netlify dashboard**
2. **Select your site**
3. **Navigate to Site settings > Environment variables**
4. **Click "Add a variable"** for each environment variable listed above
5. **Enter the Key and Value** for each variable
6. **Save the changes**

## Deployment Steps

1. **Push your code** to your Git repository (GitHub, GitLab, etc.)
2. **Connect your repository** to Netlify
3. **Configure build settings**:
   - Build command: `npm ci && npm run build:netlify`
   - Publish directory: `.next`
   - Node.js version: `20` (set in Environment variables as NODE_VERSION = 20)
4. **Set up environment variables** as described above (CRITICAL STEP)
5. **Deploy the site**

## Important Notes

⚠️ **Environment Variables Must Be Set Before Deployment**

The build will fail if environment variables are not configured in Netlify. Make sure to:

1. Set ALL required environment variables in Netlify dashboard
2. Double-check the values are correct (no extra spaces, correct URLs)
3. Save the environment variables before triggering a new build

## Build Configuration

The project includes a `netlify.toml` file with the following configuration:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_ENV = "production"
  NEXT_TELEMETRY_DISABLED = "1"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Troubleshooting

### Build Fails with "Missing Supabase environment variables"

This error occurs when the environment variables are not properly set in Netlify. Make sure all required environment variables are configured in your Netlify dashboard.

### Build Fails with TypeScript/Module Not Found Errors

If you encounter TypeScript-related build errors:

1. The project has been configured to use JavaScript for the Next.js config (`next.config.js`)
2. TypeScript is included in dependencies (not devDependencies) for proper build support
3. Node.js version is set to 20 for compatibility

### Build Command Issues

If the build command fails, ensure:

1. The build command is set to: `npm ci && npm run build:netlify`
2. The publish directory is set to: `.next`
3. All environment variables are properly configured before building

### JWT Secret Security

**⚠️ Security Warning**: The current JWT_SECRET is a placeholder. For production deployment, generate a secure random string:

```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use the generated string as your JWT_SECRET environment variable.

### Database Connection Issues

If you encounter database connection issues:

1. Verify your Supabase project is active
2. Check that the Supabase URL and keys are correct
3. Ensure your Supabase database has the required tables (run the schema from `supabase-schema.sql`)

## Post-Deployment Verification

After successful deployment:

1. **Test wallet creation** - Create a new wallet to verify database connectivity
2. **Test authentication** - Login with an existing wallet
3. **Check console logs** - Monitor for any runtime errors
4. **Verify all features** - Test signup, login, dashboard, and wallet management

## Support

If you encounter issues during deployment:

1. Check the Netlify build logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure your Supabase database is properly configured
4. Check that your domain is properly configured in Supabase settings