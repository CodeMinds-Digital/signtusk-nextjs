import { getStoredWalletList, getEncryptedWallet, storeEncryptedWallet } from './multi-wallet-storage';

/**
 * Look up the database custom_id for a wallet address
 */
export async function lookupWalletId(walletAddress: string): Promise<string | null> {
  try {
    const response = await fetch('/api/wallet/lookup-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wallet_address: walletAddress }),
    });

    if (!response.ok) {
      console.error('Failed to lookup wallet ID:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.custom_id;
  } catch (error) {
    console.error('Error looking up wallet ID:', error);
    return null;
  }
}

/**
 * Sync stored wallet IDs with database IDs
 * This updates local storage with the authoritative database custom_ids
 */
export async function syncStoredWalletIds(): Promise<Array<{ address: string, customId: string }>> {
  const storedWallets = getStoredWalletList();
  const updatedWallets: Array<{ address: string, customId: string }> = [];

  for (const wallet of storedWallets) {
    try {
      // Look up the database custom_id for this wallet
      const databaseCustomId = await lookupWalletId(wallet.address);
      
      if (databaseCustomId && databaseCustomId !== wallet.customId) {
        console.log(`🔄 Syncing wallet ID for ${wallet.address}:`, {
          oldCustomId: wallet.customId,
          newCustomId: databaseCustomId
        });

        // Update the encrypted wallet in localStorage
        const encryptedWallet = getEncryptedWallet(wallet.address);
        if (encryptedWallet) {
          const updatedEncryptedWallet = {
            ...encryptedWallet,
            customId: databaseCustomId
          };
          storeEncryptedWallet(updatedEncryptedWallet);
        }

        // Add to updated list with new ID
        updatedWallets.push({
          address: wallet.address,
          customId: databaseCustomId
        });
      } else {
        // No change needed, keep original
        updatedWallets.push(wallet);
      }
    } catch (error) {
      console.error(`Failed to sync wallet ID for ${wallet.address}:`, error);
      // Keep original on error
      updatedWallets.push(wallet);
    }
  }

  return updatedWallets;
}

/**
 * Sync a specific wallet's ID with the database
 */
export async function syncWalletId(walletAddress: string): Promise<string | null> {
  try {
    const databaseCustomId = await lookupWalletId(walletAddress);
    
    if (databaseCustomId) {
      // Update the encrypted wallet in localStorage
      const encryptedWallet = getEncryptedWallet(walletAddress);
      if (encryptedWallet && encryptedWallet.customId !== databaseCustomId) {
        console.log(`🔄 Syncing single wallet ID for ${walletAddress}:`, {
          oldCustomId: encryptedWallet.customId,
          newCustomId: databaseCustomId
        });

        const updatedEncryptedWallet = {
          ...encryptedWallet,
          customId: databaseCustomId
        };
        storeEncryptedWallet(updatedEncryptedWallet);
      }
    }

    return databaseCustomId;
  } catch (error) {
    console.error(`Failed to sync wallet ID for ${walletAddress}:`, error);
    return null;
  }
}
