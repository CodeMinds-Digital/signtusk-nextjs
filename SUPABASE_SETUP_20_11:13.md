# SignTusk Supabase Integration Setup

This document provides step-by-step instructions for setting up SignTusk with Supabase as the backend database.

## Overview

SignTusk now uses Supabase for:
- Storing encrypted wallet data
- Managing authentication challenges
- Implementing Row-Level Security (RLS) for data protection
- JWT-based session management

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. Node.js 20+ installed
3. npm or yarn package manager

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `signtusk` (or your preferred name)
   - Database Password: Generate a strong password
   - Region: Choose the closest to your users
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - **Project URL** (looks like `https://your-project-id.supabase.co`)
   - **Anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
   - **Service role key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`) - Keep this secret!

## Step 3: Set Up the Database Schema

### Option A: Simple Schema (Recommended)

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `supabase-schema-simple.sql` from this project
3. Paste it into the SQL Editor and click "Run"
4. This will create:
   - `wallets` table for storing encrypted wallet data
   - `challenges` table for authentication nonces
   - `user_profiles` table for optional user data
   - Utility functions and triggers

### Option B: Full Schema with RLS (Advanced)

If you want to use Row-Level Security policies:

1. Use `supabase-schema.sql` instead
2. Note: This requires additional setup and may need admin permissions
3. RLS policies will automatically enforce data access control

**For most users, Option A (Simple Schema) is recommended** as it provides all necessary functionality without permission issues.

### If You Get Permission Errors

If you encounter "permission denied for schema auth" errors:
- Use the simple schema (`supabase-schema-simple.sql`)
- This version doesn't require special auth schema permissions
- All security is handled through our API routes with proper authentication

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

   # JWT Secret for authentication
   JWT_SECRET=your-super-secret-jwt-key-change-in-production

   # Other settings
   NODE_ENV=development
   NEXT_TELEMETRY_DISABLED=1
   ```

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## How It Works

### Authentication Flow

1. **Wallet Creation (Signup)**:
   - User creates a wallet locally
   - Wallet is encrypted with user's password
   - Encrypted wallet is stored both locally and in Supabase
   - No traditional "user account" is created

2. **Login Flow**:
   - User enters their wallet address
   - Server generates a unique challenge (nonce)
   - User enters password to decrypt their private key
   - Private key signs the challenge
   - Server verifies the signature
   - JWT token is issued and stored in HttpOnly cookie

3. **Authenticated Requests**:
   - JWT token is automatically included in requests
   - Server verifies token and extracts wallet address
   - RLS policies ensure users can only access their own data

### Database Security

- **Row-Level Security (RLS)**: Enabled on all tables
- **JWT-based policies**: Users can only access data associated with their wallet address
- **Encrypted storage**: Private keys are encrypted before storage
- **No plaintext secrets**: Passwords never leave the client

### API Endpoints

- `POST /api/wallet/create` - Create a new wallet
- `POST /api/auth/challenge` - Get authentication challenge
- `POST /api/auth/verify` - Verify signature and authenticate
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/wallet/get` - Get wallet data for authenticated user
- `DELETE /api/wallet/delete` - Delete wallet and all associated data

## Security Considerations

1. **Environment Variables**: Never commit real credentials to version control
2. **JWT Secret**: Use a strong, random secret in production
3. **HTTPS**: Always use HTTPS in production
4. **Service Role Key**: Keep this secret and only use server-side
5. **Password Strength**: Enforce strong passwords for wallet encryption

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Ensure all required environment variables are set in `.env.local`
   - Restart the development server after changing environment variables

2. **"Database error occurred"**
   - Check that the database schema has been applied correctly
   - Verify your Supabase project is active and accessible

3. **"Invalid or expired token"**
   - Clear browser cookies and try logging in again
   - Check that JWT_SECRET is consistent across restarts

4. **"Wallet not found"**
   - Ensure the wallet was created successfully in the database
   - Check the Supabase dashboard to verify data exists

### Database Maintenance

1. **Clean up expired challenges**:
   ```sql
   SELECT cleanup_expired_challenges();
   ```

2. **View active sessions** (check JWT tokens in your application logs)

3. **Monitor database usage** in the Supabase dashboard

## Production Deployment

1. **Environment Variables**: Set all required environment variables in your hosting platform
2. **Database Backups**: Enable automatic backups in Supabase
3. **Monitoring**: Set up monitoring for your Supabase project
4. **Rate Limiting**: Consider implementing rate limiting for API endpoints
5. **CORS**: Configure CORS settings in Supabase if needed

## Support

For issues related to:
- **Supabase**: Check the [Supabase documentation](https://supabase.com/docs)
- **SignTusk**: Create an issue in this repository
- **Database Schema**: Refer to `supabase-schema.sql` for the complete schema

## Migration from Previous Version

If you're upgrading from a previous version that used localStorage only:

1. Existing wallets will continue to work locally
2. Users will need to "re-register" their wallets in the database by going through the signup flow
3. Or implement a migration script to move existing wallet data to Supabase

The application is designed to be backward compatible with existing localStorage-based wallets.