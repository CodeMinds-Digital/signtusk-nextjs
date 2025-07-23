import { supabase } from './supabase-storage';
import { UserIdentity } from './user-identity';

export interface AuthSession {
  id: string;
  user_profile_id: string;
  custom_id: string;
  wallet_address: string;
  session_token: string;
  nonce?: string;
  expires_at: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Session Management Service for secure authentication sessions
 */
export class SessionManager {
  
  /**
   * Create a new authentication session
   */
  static async createSession(
    userIdentity: UserIdentity,
    ipAddress?: string,
    userAgent?: string,
    expirationHours: number = 24
  ): Promise<string> {
    try {
      // Generate secure session token
      const sessionToken = this.generateSessionToken();
      
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      // Create session record
      const { data, error } = await supabase
        .from('auth_sessions')
        .insert([{
          user_profile_id: userIdentity.user_id,
          custom_id: userIdentity.custom_id,
          wallet_address: userIdentity.wallet_address,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        throw new Error(`Failed to create session: ${error.message}`);
      }

      return sessionToken;

    } catch (error) {
      console.error('Error in createSession:', error);
      throw error;
    }
  }

  /**
   * Validate and retrieve session information
   */
  static async validateSession(sessionToken: string): Promise<UserIdentity | null> {
    try {
      // Get session with user information
      const { data, error } = await supabase
        .from('auth_sessions')
        .select(`
          *,
          user_profiles!inner(
            id,
            custom_id,
            display_name,
            email,
            last_login,
            is_active
          ),
          wallets!inner(
            wallet_address,
            encrypted_private_key,
            encrypted_mnemonic,
            salt
          )
        `)
        .eq('session_token', sessionToken)
        .eq('user_profiles.is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null; // Session not found or expired
      }

      // Return user identity from session
      return {
        user_id: data.user_profiles.id,
        custom_id: data.user_profiles.custom_id,
        wallet_address: data.wallets.wallet_address,
        encrypted_private_key: data.wallets.encrypted_private_key,
        encrypted_mnemonic: data.wallets.encrypted_mnemonic,
        salt: data.wallets.salt,
        display_name: data.user_profiles.display_name,
        email: data.user_profiles.email,
        last_login: data.user_profiles.last_login
      };

    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  /**
   * Refresh session expiration
   */
  static async refreshSession(
    sessionToken: string, 
    expirationHours: number = 24
  ): Promise<boolean> {
    try {
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + expirationHours);

      const { error } = await supabase
        .from('auth_sessions')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString());

      return !error;

    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  /**
   * Invalidate a specific session
   */
  static async invalidateSession(sessionToken: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('auth_sessions')
        .delete()
        .eq('session_token', sessionToken);

      return !error;

    } catch (error) {
      console.error('Error invalidating session:', error);
      return false;
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  static async invalidateAllUserSessions(customId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('auth_sessions')
        .delete()
        .eq('custom_id', customId);

      return !error;

    } catch (error) {
      console.error('Error invalidating user sessions:', error);
      return false;
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(customId: string): Promise<AuthSession[]> {
    try {
      const { data, error } = await supabase
        .from('auth_sessions')
        .select('*')
        .eq('custom_id', customId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting user sessions:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getUserSessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('clean_expired_sessions');

      if (error) {
        console.error('Error cleaning expired sessions:', error);
        return 0;
      }

      return data || 0;

    } catch (error) {
      console.error('Error in cleanupExpiredSessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(): Promise<{
    total_active_sessions: number;
    unique_active_users: number;
    sessions_created_today: number;
  }> {
    try {
      const now = new Date().toISOString();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [activeSessionsResult, uniqueUsersResult, todaySessionsResult] = await Promise.all([
        supabase
          .from('auth_sessions')
          .select('id', { count: 'exact' })
          .gt('expires_at', now),
        supabase
          .from('auth_sessions')
          .select('custom_id', { count: 'exact' })
          .gt('expires_at', now),
        supabase
          .from('auth_sessions')
          .select('id', { count: 'exact' })
          .gte('created_at', todayStart.toISOString())
      ]);

      return {
        total_active_sessions: activeSessionsResult.count || 0,
        unique_active_users: uniqueUsersResult.count || 0,
        sessions_created_today: todaySessionsResult.count || 0
      };

    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        total_active_sessions: 0,
        unique_active_users: 0,
        sessions_created_today: 0
      };
    }
  }

  /**
   * Generate secure session token
   */
  private static generateSessionToken(): string {
    // Generate a secure random token
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for server-side
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    
    // Convert to hex string
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Extract session token from request headers
   */
  static extractSessionToken(request: Request): string | null {
    // Try Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try custom session header
    const sessionHeader = request.headers.get('x-session-token');
    if (sessionHeader) {
      return sessionHeader;
    }

    // Try cookie
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const sessionCookie = cookieHeader
        .split(';')
        .find(cookie => cookie.trim().startsWith('session_token='));
      
      if (sessionCookie) {
        return sessionCookie.split('=')[1];
      }
    }

    return null;
  }

  /**
   * Create session cookie string
   */
  static createSessionCookie(
    sessionToken: string, 
    expirationHours: number = 24,
    secure: boolean = true
  ): string {
    const expires = new Date();
    expires.setHours(expires.getHours() + expirationHours);

    let cookie = `session_token=${sessionToken}; `;
    cookie += `Expires=${expires.toUTCString()}; `;
    cookie += `Path=/; `;
    cookie += `HttpOnly; `;
    cookie += `SameSite=Strict`;
    
    if (secure) {
      cookie += `; Secure`;
    }

    return cookie;
  }

  /**
   * Create session removal cookie
   */
  static createSessionRemovalCookie(): string {
    return `session_token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Strict`;
  }
}

export default SessionManager;