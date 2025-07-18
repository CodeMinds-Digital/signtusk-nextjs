# SecureWallet - Decentralized Ethereum Wallet

A MetaMask-like wallet application built with Next.js 15 that provides secure, decentralized account management without requiring MetaMask or any external wallet dependencies.

## 🚀 Features

### Core Functionality
- **🔐 Secure Wallet Creation**: Generate BIP39-compliant 12 or 24-word mnemonic phrases
- **🔑 Private Key Management**: Ethereum-compatible key pairs derived from mnemonic
- **🛡️ Military-Grade Encryption**: AES-256 encryption with PBKDF2 key derivation
- **💾 Local Storage**: Encrypted wallet data stored securely in browser localStorage
- **🔒 Session Management**: Secure session handling with automatic expiration

### Security Features
- **📝 Mnemonic Verification**: Random word verification during wallet creation
- **🔍 Login Verification**: Optional mnemonic word verification during login
- **🔐 Password Strength**: Enforced strong password requirements
- **⚠️ Security Warnings**: Clear warnings about private key and mnemonic safety

### User Experience
- **🎨 Modern UI**: Clean, responsive design with Tailwind CSS
- **📱 Mobile Friendly**: Works on desktop, tablet, and mobile devices
- **🚀 Fast Performance**: Built with Next.js 15 and App Router
- **♿ Accessible**: Keyboard navigation and screen reader friendly

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS 4
- **Blockchain**: Ethers.js for Ethereum integration
- **Cryptography**: 
  - `bip39` for mnemonic generation
  - `@scure/bip32` for key derivation
  - `crypto-js` for encryption
- **Session Management**: `iron-session`
- **Language**: TypeScript

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd signtusk
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Usage

### Creating a New Wallet

1. **Visit the homepage** and click "Create Your Wallet"
2. **Choose mnemonic length** (12 or 24 words)
3. **Set a strong password** (minimum 8 characters with uppercase, lowercase, and number)
4. **Save your recovery phrase** - Write down the 12/24 words in order
5. **Verify your recovery phrase** - Enter 3 random words to confirm you saved it
6. **Access your dashboard** - Your wallet is now created and encrypted locally

### Logging In

1. **Visit the homepage** and click "Access Your Wallet"
2. **Enter your password** that you used during wallet creation
3. **Optional verification** - Enter 3 random words from your recovery phrase
4. **Access granted** - You're now logged into your wallet

### Importing an Existing Wallet

1. **Visit the homepage** and click "Import Existing Wallet"
2. **Enter your recovery phrase** (12 or 24 words)
3. **Set a new password** for local encryption
4. **Wallet imported** - Your existing wallet is now available locally

## 🔒 Security Model

### Encryption
- **AES-256 encryption** for mnemonic and private key storage
- **PBKDF2 key derivation** with 10,000 iterations and random salt
- **Local storage only** - No data sent to external servers

### Key Management
- **BIP39 standard** mnemonic generation and validation
- **BIP32 HD wallet** key derivation
- **Ethereum-compatible** addresses and private keys

### Session Security
- **Temporary sessions** stored in sessionStorage
- **24-hour expiration** with automatic cleanup
- **No persistent login** - requires password on each session

## 🌐 API Routes

### Authentication
- `POST /api/auth/verify` - Verify message signatures
- Validates Ethereum signatures for authentication

### Profile Management
- `POST /api/profile/save` - Save encrypted profile data
- `GET /api/profile/save?address=<address>` - Load profile data

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── import/           # Import wallet page
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Homepage
├── components/            # React components
│   ├── Dashboard.tsx     # Wallet dashboard
│   ├── ImportWallet.tsx  # Import wallet flow
│   ├── LoginFlow.tsx     # Login flow
│   ├── SignupFlow.tsx    # Signup flow
│   └── WalletLanding.tsx # Landing page
├── contexts/             # React contexts
│   └── WalletContext.tsx # Wallet state management
└── lib/                  # Utility libraries
    ├── signing.ts        # Message signing utilities
    ├── storage.ts        # Local storage utilities
    └── wallet.ts         # Core wallet functions
```

## ⚠️ Security Warnings

### For Users
- **Never share your recovery phrase** with anyone
- **Store your recovery phrase safely** - write it down and keep it secure
- **Use a strong password** for local encryption
- **Clear browser data carefully** - this will require wallet recovery
- **Verify URLs** - only use the official application URL

### For Developers
- **This is a demo application** - not audited for production use
- **Local storage limitations** - data can be lost if browser data is cleared
- **No backup mechanism** - users must manage their own recovery phrases
- **Client-side only** - no server-side wallet recovery possible

## 🚧 Limitations

- **No transaction functionality** - wallet creation and management only
- **No network connectivity** - doesn't connect to Ethereum networks
- **No balance checking** - placeholder balance display
- **Browser dependent** - requires modern browser with localStorage support
- **No multi-device sync** - each device requires separate wallet import

## 🔮 Future Enhancements

- **Transaction support** - Send and receive Ethereum transactions
- **Network integration** - Connect to mainnet, testnets
- **Hardware wallet support** - Ledger, Trezor integration
- **IPFS profile storage** - Decentralized profile backup
- **Multi-device sync** - QR code wallet transfer
- **Biometric authentication** - WebAuthn support
- **DeFi integration** - Token swaps, staking
- **NFT support** - View and manage NFTs

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests for any improvements.

## ⚡ Quick Start Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🆘 Support

If you encounter any issues or have questions:

1. Check the browser console for error messages
2. Ensure you're using a modern browser with localStorage support
3. Verify your recovery phrase is entered correctly (lowercase, space-separated)
4. Make sure your password meets the strength requirements

Remember: **Your recovery phrase is the only way to restore your wallet. Keep it safe!**