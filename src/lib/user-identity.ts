import { supabase } from './supabase-storage';

/**
 * Generate a custom ID for the wallet (15 characters)
 * Format: 3 letters + 4 numbers + 4 letters + 4 numbers
 */
function generateCustomId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';

  let customId = '';

  // First 3 letters
  for (let i = 0; i < 3; i++) {
    customId += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // 4 numbers
  for (let i = 0; i < 4; i++) {
    customId += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  // 4 letters
  for (let i = 0; i < 4; i++) {
    customId += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // 4 numbers
  for (let i = 0; i < 4; i++) {
    customId += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return customId; // Total: 15 characters
}

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
 * FIXED VERSION - Handles database function return types correctly
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

      // TEMPORARY WORKAROUND: Use direct SQL instead of function
      // Generate custom ID
      const customId = generateCustomId();

      // Create user profile first
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .insert({
          custom_id: customId,
          display_name: displayName,
          email: email
        })
        .select('id')
        .single();

      if (userError) {
        console.error('Error creating user profile:', userError);
        throw new Error(`Failed to create user profile: ${userError.message}`);
      }

      // Create wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .insert({
          user_profile_id: userProfile.id,
          custom_id: customId,
          wallet_address: walletAddress.toLowerCase(),
          encrypted_private_key: encryptedPrivateKey,
          encrypted_mnemonic: encryptedMnemonic,
          salt: salt
        })
        .select('id')
        .single();

      if (walletError) {
        console.error('Error creating wallet:', walletError);
        // Clean up user profile if wallet creation fails
        await supabase.from('user_profiles').delete().eq('id', userProfile.id);
        throw new Error(`Failed to create wallet: ${walletError.message}`);
      }

      // Simulate the function return format
      const data = [{
        user_id: userProfile.id,
        custom_id: customId,
        wallet_address: walletAddress.toLowerCase()
      }];
      const error = null;

      if (error) {
        console.error('Error creating user with wallet:', error);
        throw new Error(`Failed to create user: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Failed to create user: No data returned');
      }

      // FIXED: Handle the database function return correctly
      // The function returns a table, so data is an array of objects
      const result = Array.isArray(data) ? data[0] : data;

      console.log('Database function result:', result);

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

      // FIXED: Handle the database function return correctly
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
   * Check if custom ID exists (for validation)
   */
  static async customIdExists(customId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('custom_id')
        .eq('custom_id', customId)
        .single();

      if (error && error.code === 'PGRST116') {
        return false; // Custom ID not found
      }

      return !!data;

    } catch (error) {
      console.error('Error checking custom ID existence:', error);
      return false;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    total_users: number;
    active_users: number;
    users_with_activity: number;
  }> {
    try {
      const [totalResult, activeResult, activityResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact' }),
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact' })
          .eq('is_active', true),
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact' })
          .not('last_login', 'is', null)
      ]);

      return {
        total_users: totalResult.count || 0,
        active_users: activeResult.count || 0,
        users_with_activity: activityResult.count || 0
      };

    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        total_users: 0,
        active_users: 0,
        users_with_activity: 0
      };
    }
  }

  /**
   * Clean expired sessions (utility function)
   */
  static async cleanExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('clean_expired_sessions');

      if (error) {
        console.error('Error cleaning expired sessions:', error);
        return 0;
      }

      return data || 0;

    } catch (error) {
      console.error('Error in cleanExpiredSessions:', error);
      return 0;
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(customId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('custom_id', customId);

      if (error) {
        console.error('Error deactivating user:', error);
        throw new Error(`Failed to deactivate user: ${error.message}`);
      }

    } catch (error) {
      console.error('Error in deactivateUser:', error);
      throw error;
    }
  }

  /**
   * Reactivate user account
   */
  static async reactivateUser(customId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: true })
        .eq('custom_id', customId);

      if (error) {
        console.error('Error reactivating user:', error);
        throw new Error(`Failed to reactivate user: ${error.message}`);
      }

    } catch (error) {
      console.error('Error in reactivateUser:', error);
      throw error;
    }
  }

  /**
   * Test the database function directly (for debugging)
   */
  static async testCreateUserFunction(): Promise<any> {
    try {
      console.log('Testing create_user_with_wallet function...');

      const { data, error } = await supabase.rpc('create_user_with_wallet', {
        p_wallet_address: '0xtest123456789012345678901234567890',
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

      return { success: true, data };

    } catch (error) {
      console.error('Function test exception:', error);
      return { success: false, error };
    }
  }
}

export default UserIdentityService;