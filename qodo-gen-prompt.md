# Prompt for Full-Stack Web3 Wallet Authentication System

## Objective
Develop a full-stack application using Next.js and TypeScript that implements a secure, wallet-centric Web3 authentication system. The system will allow users to create, import, and manage an Ethereum wallet directly within the application. Authentication is based on cryptographic signatures, not traditional email/password accounts.

## Core Concepts
*   **Wallet as Identity:** The user's Ethereum wallet address is their primary and sole identifier. There are no "user accounts" in the traditional sense.
*   **Local Encryption:** The user provides a password *only* to encrypt and decrypt their wallet's private key (or mnemonic phrase). This password is a local secret, is never sent to the server, and is not used for traditional "login."
*   **Signature-Based Authentication:** Logging in is achieved by proving ownership of a wallet address by signing a unique challenge message provided by the backend.

## Core Features
1.  **Wallet Creation (Signup Flow):**
    *   Generate a new Ethereum HD wallet (mnemonic, private key, address) on the client.
    *   Prompt the user to create a strong password.
    *   Use the user's password to encrypt the wallet's private key/mnemonic.
    *   Store the `wallet_address` and the `encrypted_private_key` in the Supabase `wallets` table. This process does not involve Supabase Auth.
2.  **Login Flow (Challenge-Response):**
    *   User initiates login by providing their wallet address.
    *   The backend generates and sends a unique, single-use message (nonce) as a challenge.
    *   On the client, the user enters their password to decrypt the private key.
    *   The decrypted private key is used to sign the nonce.
    *   The signature is sent to the backend for verification.
    *   If the signature is valid, the backend establishes a secure session for the `wallet_address`.
3.  **Wallet Management:**
    *   Provide a secure way for the user to view their private key/mnemonic after re-entering their password for decryption.
    *   Allow users to import an existing wallet using a private key or mnemonic phrase.
    *   Allow users to delete their wallet data from the backend.
4.  **Authenticated State:**
    *   A dashboard page accessible only to authenticated wallet addresses.
    *   Display the user's wallet address and other relevant information.

---
## Technical Specifications

### 1. Backend (Next.js API Routes)

*   **`POST /api/wallet/create`**:
    *   **Request Body:** `{ wallet_address: string, encrypted_private_key: string }`
    *   **Logic:**
        1.  Validate the incoming data.
        2.  Check if a wallet with the given `wallet_address` already exists.
        3.  Store the `wallet_address` and `encrypted_private_key` in the `wallets` table in Supabase.
        4.  Return a success message.
*   **`POST /api/auth/challenge`**:
    *   **Request Body:** `{ wallet_address: string }`
    *   **Logic:**
        1.  Generate a secure, random, unique nonce (e.g., `Signing challenge: 1a2b3c4d`).
        2.  Store the nonce temporarily (e.g., in the database or a cache) associated with the `wallet_address` and a short expiry time.
        3.  Return the `nonce` to the client.
*   **`POST /api/auth/verify`**:
    *   **Request Body:** `{ wallet_address: string, signature: string }`
    *   **Logic:**
        1.  Retrieve the pending nonce for the given `wallet_address`.
        2.  Verify that the provided `signature` was produced by signing the nonce with the private key corresponding to the `wallet_address`.
        3.  If verification is successful, delete the used nonce.
        4.  Generate a JWT containing the authenticated `wallet_address`.
        5.  Return the JWT to the client in a secure HttpOnly cookie.
*   **`GET /api/auth/me`**:
    *   **Headers:** `Authorization: Bearer <JWT>`
    *   **Logic:**
        1.  Verify the JWT.
        2.  Return the authenticated `wallet_address` from the token payload.

### 2. Frontend (Next.js / React / TypeScript)

*   **`/` or `/create-wallet` Page:**
    *   A flow to guide the user through generating a new wallet.
    *   Clearly explain that the password is for encryption only.
    *   After generation, show the user their address and prompt them to save their private key/mnemonic securely.
    *   Call the `POST /api/wallet/create` endpoint.
*   **`/login` Page:**
    *   A form with a single `wallet_address` field.
    *   On submit, call `POST /api/auth/challenge` to get the nonce.
    *   Prompt the user for their password to decrypt the locally stored private key.
    *   Sign the nonce and call `POST /api/auth/verify`.
    *   On success, redirect to the dashboard.
*   **`/dashboard` Page (Protected Route):**
    *   Should only be accessible to authenticated users.
    *   Display the user's wallet address.
    *   A button to "Reveal Private Key" which prompts for the password for decryption.
*   **`WalletContext`:**
    *   A React context to manage wallet state (address, encrypted key, auth status) across the application.

### 3. Database Schema (Supabase / Prisma)

```prisma
-- No more 'User' table from Supabase Auth.
-- RLS policies will be based on the authenticated wallet address.

model wallets {
  id                    String   @id @default(cuid())
  wallet_address        String   @unique
  encrypted_private_key String
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
}
```

### 4. Row-Level Security (RLS) Policies in Supabase

*   RLS policies must be based on the `wallet_address` stored in the JWT.
*   Create a helper function in PostgreSQL to extract the `wallet_address` from the current session's JWT.
    ```sql
    create or replace function auth.wallet_address() returns text as $$
      select nullif(current_setting('request.jwt.claims', true)::json->>'wallet_address', '')::text;
    $$ language sql stable;
    ```
*   **Example RLS Policy on a `todos` table:**
    *   **`ENABLE ROW LEVEL SECURITY`** on the table.
    *   **`CREATE POLICY "Users can view their own todos." ON todos FOR SELECT USING (auth.wallet_address() = wallet_address);`**
    *   **`CREATE POLICY "Users can insert their own todos." ON todos FOR INSERT WITH CHECK (auth.wallet_address() = wallet_address);`**

### 5. Security & Best Practices

*   **Private Key Encryption:** Use a strong symmetric encryption algorithm like `AES-256-GCM` on the client-side to encrypt the private key before sending it to the backend. **Never store or transmit plain-text private keys.**
*   **Client-Side Storage:** The encrypted private key should be stored securely on the client (e.g., in `localStorage`).
*   **JWT Security:** Use a strong, secret key for signing JWTs and store them in HttpOnly cookies.
*   **Input Validation:** Validate all user input on both the client and server.
*   **Cryptographic Library:** Use a reputable library like `ethers.js` or `viem` for all wallet generation and cryptographic operations.