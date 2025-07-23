import { supabase } from './supabase-storage';

export interface UserProfile {
  id: string;
  custom_id: string;
  email?: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface UserWallet {
  id: string;
  user_profile_id: string;
  custom_id: string;
  wallet_address: string;
  encrypted_private_key: string;
  encrypted_mnemonic?: string;
  salt?: string;
  created_at: string;
  updated_at: string;
  is_primary: boolean;
}

export interface UserIdentity {
  user_id: string;
  custom_id: string;
  wallet_address: string;
  encrypted_private_key: string;
  encrypted_mnemonic?: string;
  salt?: string;
  display_name?: string;
  email?: string;
  last_login?: string;
}

/**
 * User Identity Service for consistent custom_id and wallet_address management
 * ALTERNATIVE VERSION - Uses composite type return to avoid table return issues
 */
export class UserIdentityService {
  
  /**
   * Create a new user with wallet (Sign-up)
   * This ensures custom_id and wallet_address are generated once and stored permanently
   */
  static async createUserWithWallet(
    walletAddress: string,
    encryptedPrivateKey: string,
    encryptedMnemonic?: string,
    salt?: string,
    displayName?: string,
    email?: string
  ): Promise<UserIdentity> {
    try {
      // Check if wallet address already exists
      const existingUser = await this.getUserByWalletAddress(walletAddress);
      if (existingUser) {
        throw new Error('Wallet address already exists. Please use login instead.');
      }

      console.log('Calling create_user_with_wallet function with:', {
        p_wallet_address: walletAddress.toLowerCase(),
        p_encrypted_private_key: encryptedPrivateKey ? 'PROVIDED' : 'NULL',
        p_encrypted_mnemonic: encryptedMnemonic ? 'PROVIDED' : 'NULL',
        p_salt: salt ? 'PROVIDED' : 'NULL',
        p_display_name: displayName,
        p_email: email
      });

      // Call the database function to create user with wallet
      const { data, error } = await supabase.rpc('create_user_with_wallet', {
        p_wallet_address: walletAddress.toLowerCase(),
        p_encrypted_private_key: encryptedPrivateKey,
        p_encrypted_mnemonic: encryptedMnemonic,
        p_salt: salt,
        p_display_name: displayName,
        p_email: email
      });

      console.log('Database function response:', { data, error });

      if (error) {
        console.error('Error creating user with wallet:', error);
        throw new Error(`Failed to create user: ${error.message}`);
      }

      if (!data) {
        throw new Error('Failed to create user: No data returned');
      }

      // ALTERNATIVE APPROACH: Handle composite type return
      // The function now returns a single object, not an array
      const result = data;
      
      console.log('Processed result:', result);
      
      // Return the complete user identity
      return {
        user_id: result.user_id,
        custom_id: result.custom_id,
        wallet_address: result.wallet_address,
        encrypted_private_key: encryptedPrivateKey,
        encrypted_mnemonic: encryptedMnemonic,
        salt: salt,
        display_name: displayName,
        email: email
      };

    } catch (error) {
      console.error('Error in createUserWithWallet:', error);
      throw error;
    }
  }

  /**
   * Get user by wallet address (Login)
   * This retrieves the existing custom_id and wallet_address - NO regeneration
   */
  static async getUserByWalletAddress(walletAddress: string): Promise<UserIdentity | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_by_wallet_address', {
        p_wallet_address: walletAddress.toLowerCase()
      });

      if (error) {
        console.error('Error getting user by wallet address:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null; // User not found
      }

      // Handle the database function return correctly
      const user = Array.isArray(data) ? data[0] : data;
      
      return {
        user_id: user.user_id,
        custom_id: user.custom_id,
        wallet_address: user.wallet_address,
        encrypted_private_key: user.encrypted_private_key,
        encrypted_mnemonic: user.encrypted_mnemonic,
        salt: user.salt,
        display_name: user.display_name,
        email: user.email,
        last_login: user.last_login
      };

    } catch (error) {
      console.error('Error in getUserByWalletAddress:', error);
      return null;
    }
  }

  /**
   * Get user by custom ID
   */
  static async getUserByCustomId(customId: string): Promise<UserIdentity | null> {
    try {
      const { data, error } = await supabase
        .from('user_wallet_view')
        .select('*')
        .eq('custom_id', customId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        console.error('Error getting user by custom ID:', error);
        return null;
      }

      return {
        user_id: data.user_id,
        custom_id: data.custom_id,
        wallet_address: data.wallet_address,
        encrypted_private_key: data.encrypted_private_key,
        encrypted_mnemonic: data.encrypted_mnemonic,
        salt: data.salt,
        display_name: data.display_name,
        email: data.email,
        last_login: data.last_login
      };

    } catch (error) {
      console.error('Error in getUserByCustomId:', error);
      return null;
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(customId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_last_login', {
        p_custom_id: customId
      });

      if (error) {
        console.error('Error updating last login:', error);
        throw new Error(`Failed to update last login: ${error.message}`);
      }

    } catch (error) {
      console.error('Error in updateLastLogin:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    customId: string, 
    updates: { display_name?: string; email?: string }
  ): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('custom_id', customId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      throw error;
    }
  }

  /**
   * Check if wallet address exists (for validation during sign-up)
   */
  static async walletAddressExists(walletAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('wallet_address')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') {
        return false; // Wallet not found
      }

      return !!data;

    } catch (error) {
      console.error('Error checking wallet address existence:', error);
      return false;
    }
  }

  /**
   * Test the database function directly (for debugging)
   */
  static async testCreateUserFunction(): Promise<any> {
    try {
      console.log('Testing create_user_with_wallet function...');
      
      const testWalletAddress = '0xtest' + Date.now();
      
      const { data, error } = await supabase.rpc('create_user_with_wallet', {
        p_wallet_address: testWalletAddress,
        p_encrypted_private_key: 'test_encrypted_key',
        p_encrypted_mnemonic: 'test_encrypted_mnemonic',
        p_salt: 'test_salt',
        p_display_name: 'Test User',
        p_email: 'test@example.com'
      });

      console.log('Function test result:', { data, error });
      
      if (error) {
        console.error('Function test error:', error);
        return { success: false, error };
      }

      // Clean up test data
      if (data && data.custom_id) {
        try {
          await supabase.from('wallets').delete().eq('wallet_address', testWalletAddress);
          await supabase.from('user_profiles').delete().eq('custom_id', data.custom_id);
          console.log('Test data cleaned up');
        } catch (cleanupError) {
          console.warn('Failed to clean up test data:', cleanupError);
        }
      }

      return { success: true, data };

    } catch (error) {
      console.error('Function test exception:', error);
      return { success: false, error };
    }
  }
}

export default UserIdentityService;