import { WalletData } from '@/lib/wallet';

export interface IdentityConsistencyResult {
  isConsistent: boolean;
  issues: string[];
  recommendedAction: string;
  details: {
    walletCustomId?: string;
    authCustomId?: string;
    walletAddress?: string;
    authWalletAddress?: string;
  };
}

/**
 * Check consistency between local wallet data and authenticated user data
 * @param wallet - Local wallet data from storage
 * @param currentUser - Authenticated user data from JWT
 * @returns Consistency check result
 */
export function checkIdentityConsistency(
  wallet: WalletData | null,
  currentUser: { custom_id?: string; wallet_address: string } | null
): IdentityConsistencyResult {
  const issues: string[] = [];
  const details = {
    walletCustomId: wallet?.customId,
    authCustomId: currentUser?.custom_id,
    walletAddress: wallet?.address,
    authWalletAddress: currentUser?.wallet_address,
  };
  
  if (!wallet || !currentUser) {
    return {
      isConsistent: false,
      issues: ['Missing wallet or user authentication data'],
      recommendedAction: 'Please re-authenticate with your wallet',
      details
    };
  }
  
  // Check if wallet address matches
  if (wallet.address.toLowerCase() !== currentUser.wallet_address.toLowerCase()) {
    issues.push(`Wallet address mismatch: Local=${wallet.address}, Auth=${currentUser.wallet_address}`);
  }
  
  // Check if custom_id matches
  if (wallet.customId !== currentUser.custom_id) {
    issues.push(`Signer ID mismatch: Local=${wallet.customId}, Database=${currentUser.custom_id}`);
  }
  
  // Check if custom_id format is valid
  if (currentUser.custom_id && !validateCustomIdFormat(currentUser.custom_id)) {
    issues.push(`Invalid Signer ID format: ${currentUser.custom_id}`);
  }
  
  if (wallet.customId && !validateCustomIdFormat(wallet.customId)) {
    issues.push(`Invalid local Signer ID format: ${wallet.customId}`);
  }
  
  let recommendedAction = 'No action needed';
  if (issues.length > 0) {
    if (issues.some(issue => issue.includes('address mismatch'))) {
      recommendedAction = 'Critical: Re-authenticate with correct wallet';
    } else if (issues.some(issue => issue.includes('ID mismatch'))) {
      recommendedAction = 'Sync identity data - use database Signer ID';
    } else {
      recommendedAction = 'Contact support for identity validation';
    }
  }
  
  return {
    isConsistent: issues.length === 0,
    issues,
    recommendedAction,
    details
  };
}

/**
 * Validate custom ID format according to industrial standards
 * Format: 3 letters + 4 numbers + 3 letters + 4 numbers (e.g., ABC1234DEF5678)
 * @param customId - The custom ID to validate
 * @returns True if format is valid
 */
export function validateCustomIdFormat(customId: string): boolean {
  if (!customId || typeof customId !== 'string') {
    return false;
  }
  
  // Format: 3 letters + 4 numbers + 3 letters + 4 numbers
  const pattern = /^[A-Z]{3}[0-9]{4}[A-Z]{3}[0-9]{4}$/;
  return pattern.test(customId);
}

/**
 * Get the authoritative Signer ID (prioritizes authenticated user's custom_id)
 * @param wallet - Local wallet data
 * @param currentUser - Authenticated user data
 * @returns The authoritative Signer ID to use
 */
export function getAuthoritativeSignerId(
  wallet: WalletData | null,
  currentUser: { custom_id?: string; wallet_address: string } | null
): string | null {
  // Priority 1: Authenticated user's custom_id (from database)
  if (currentUser?.custom_id && validateCustomIdFormat(currentUser.custom_id)) {
    return currentUser.custom_id;
  }
  
  // Priority 2: Local wallet customId (fallback)
  if (wallet?.customId && validateCustomIdFormat(wallet.customId)) {
    return wallet.customId;
  }
  
  // No valid Signer ID found
  return null;
}

/**
 * Create a standardized identity object for use throughout the application
 * @param wallet - Local wallet data
 * @param currentUser - Authenticated user data
 * @returns Standardized identity object
 */
export function createStandardizedIdentity(
  wallet: WalletData | null,
  currentUser: { custom_id?: string; wallet_address: string } | null
): {
  signerId: string | null;
  walletAddress: string | null;
  isValid: boolean;
  source: 'database' | 'local' | 'none';
} {
  const signerId = getAuthoritativeSignerId(wallet, currentUser);
  
  let walletAddress: string | null = null;
  let source: 'database' | 'local' | 'none' = 'none';
  
  if (currentUser?.wallet_address) {
    walletAddress = currentUser.wallet_address;
    source = 'database';
  } else if (wallet?.address) {
    walletAddress = wallet.address;
    source = 'local';
  }
  
  return {
    signerId,
    walletAddress,
    isValid: !!(signerId && walletAddress),
    source
  };
}

/**
 * Log identity consistency issues for debugging
 * @param wallet - Local wallet data
 * @param currentUser - Authenticated user data
 * @param context - Context where the check is being performed
 */
export function logIdentityConsistency(
  wallet: WalletData | null,
  currentUser: { custom_id?: string; wallet_address: string } | null,
  context: string = 'unknown'
): void {
  const result = checkIdentityConsistency(wallet, currentUser);
  
  if (!result.isConsistent) {
    console.warn(`[Identity Consistency] Issues detected in ${context}:`, {
      issues: result.issues,
      recommendedAction: result.recommendedAction,
      details: result.details,
      timestamp: new Date().toISOString()
    });
  } else {
    console.log(`[Identity Consistency] ✅ Consistent identity in ${context}`, {
      signerId: result.details.authCustomId || result.details.walletCustomId,
      walletAddress: result.details.authWalletAddress || result.details.walletAddress
    });
  }
}

/**
 * Create a user-friendly error message for identity issues
 * @param result - Identity consistency check result
 * @returns User-friendly error message
 */
export function createIdentityErrorMessage(result: IdentityConsistencyResult): string {
  if (result.isConsistent) {
    return '';
  }
  
  if (result.issues.some(issue => issue.includes('address mismatch'))) {
    return 'Your wallet address doesn\'t match your authenticated session. Please log out and log back in with the correct wallet.';
  }
  
  if (result.issues.some(issue => issue.includes('ID mismatch'))) {
    return `Your Signer ID has been updated in our system. Your current Signer ID is: ${result.details.authCustomId}. Please refresh the page to sync your local data.`;
  }
  
  if (result.issues.some(issue => issue.includes('Missing'))) {
    return 'Authentication data is incomplete. Please log out and log back in to refresh your session.';
  }
  
  return 'There\'s an issue with your identity data. Please contact support if this problem persists.';
}

/**
 * Attempt to fix identity consistency issues automatically
 * @param wallet - Local wallet data
 * @param currentUser - Authenticated user data
 * @returns Whether the fix was successful
 */
export function attemptIdentityFix(
  wallet: WalletData | null,
  currentUser: { custom_id?: string; wallet_address: string } | null
): { success: boolean; message: string; updatedWallet?: WalletData } {
  const result = checkIdentityConsistency(wallet, currentUser);
  
  if (result.isConsistent) {
    return { success: true, message: 'Identity is already consistent' };
  }
  
  // If we have a valid authenticated custom_id but wallet has different one
  if (
    currentUser?.custom_id && 
    wallet && 
    wallet.customId !== currentUser.custom_id &&
    validateCustomIdFormat(currentUser.custom_id)
  ) {
    // Update local wallet with database custom_id
    const updatedWallet: WalletData = {
      ...wallet,
      customId: currentUser.custom_id
    };
    
    return {
      success: true,
      message: `Updated local Signer ID to match database: ${currentUser.custom_id}`,
      updatedWallet
    };
  }
  
  return {
    success: false,
    message: 'Cannot automatically fix identity issues. Manual intervention required.'
  };
}