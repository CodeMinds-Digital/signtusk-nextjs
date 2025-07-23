import { supabase } from './supabase-storage';

export interface SchemaVersion {
  version: string;
  applied_at: string;
  description: string;
}

/**
 * Schema Version Management Service
 */
export class SchemaVersionManager {
  
  /**
   * Get current schema version
   */
  static async getCurrentVersion(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('schema_version')
        .select('version')
        .order('applied_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No version found
        }
        console.error('Error getting current schema version:', error);
        return null;
      }

      return data.version;

    } catch (error) {
      console.error('Error in getCurrentVersion:', error);
      return null;
    }
  }

  /**
   * Get all schema versions
   */
  static async getAllVersions(): Promise<SchemaVersion[]> {
    try {
      const { data, error } = await supabase
        .from('schema_version')
        .select('*')
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Error getting schema versions:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getAllVersions:', error);
      return [];
    }
  }

  /**
   * Add new schema version
   */
  static async addVersion(version: string, description: string): Promise<boolean> {
    try {
      // Check if version already exists
      const { data: existing } = await supabase
        .from('schema_version')
        .select('version')
        .eq('version', version)
        .single();

      if (existing) {
        console.warn(`Schema version ${version} already exists`);
        return false;
      }

      // Insert new version
      const { error } = await supabase
        .from('schema_version')
        .insert([{
          version,
          description,
          applied_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error adding schema version:', error);
        return false;
      }

      console.log(`Schema version ${version} added successfully`);
      return true;

    } catch (error) {
      console.error('Error in addVersion:', error);
      return false;
    }
  }

  /**
   * Check if schema version exists
   */
  static async versionExists(version: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('schema_version')
        .select('version')
        .eq('version', version)
        .single();

      if (error && error.code === 'PGRST116') {
        return false; // Version not found
      }

      return !!data;

    } catch (error) {
      console.error('Error checking version existence:', error);
      return false;
    }
  }

  /**
   * Compare version strings (semantic versioning)
   */
  static compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Check if current version is compatible with required version
   */
  static async isVersionCompatible(requiredVersion: string): Promise<boolean> {
    try {
      const currentVersion = await this.getCurrentVersion();
      
      if (!currentVersion) {
        console.warn('No schema version found in database');
        return false;
      }

      // Current version should be >= required version
      return this.compareVersions(currentVersion, requiredVersion) >= 0;

    } catch (error) {
      console.error('Error checking version compatibility:', error);
      return false;
    }
  }

  /**
   * Get version history with details
   */
  static async getVersionHistory(): Promise<{
    current_version: string | null;
    total_versions: number;
    versions: SchemaVersion[];
    latest_update: string | null;
  }> {
    try {
      const versions = await this.getAllVersions();
      const currentVersion = versions.length > 0 ? versions[0].version : null;
      const latestUpdate = versions.length > 0 ? versions[0].applied_at : null;

      return {
        current_version: currentVersion,
        total_versions: versions.length,
        versions,
        latest_update: latestUpdate
      };

    } catch (error) {
      console.error('Error getting version history:', error);
      return {
        current_version: null,
        total_versions: 0,
        versions: [],
        latest_update: null
      };
    }
  }

  /**
   * Initialize schema version tracking (for first-time setup)
   */
  static async initializeVersioning(initialVersion: string = '1.0.0'): Promise<boolean> {
    try {
      // Check if any versions exist
      const versions = await this.getAllVersions();
      
      if (versions.length > 0) {
        console.log('Schema versioning already initialized');
        return true;
      }

      // Add initial version
      const success = await this.addVersion(
        initialVersion, 
        'Initial schema version with user identity management and document signing system'
      );

      if (success) {
        console.log(`Schema versioning initialized with version ${initialVersion}`);
      }

      return success;

    } catch (error) {
      console.error('Error initializing versioning:', error);
      return false;
    }
  }

  /**
   * Validate version format (semantic versioning)
   */
  static isValidVersionFormat(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Get next version suggestion
   */
  static async getNextVersionSuggestion(type: 'major' | 'minor' | 'patch' = 'patch'): Promise<string> {
    try {
      const currentVersion = await this.getCurrentVersion();
      
      if (!currentVersion) {
        return '1.0.0';
      }

      const parts = currentVersion.split('.').map(Number);
      
      switch (type) {
        case 'major':
          return `${parts[0] + 1}.0.0`;
        case 'minor':
          return `${parts[0]}.${parts[1] + 1}.0`;
        case 'patch':
        default:
          return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
      }

    } catch (error) {
      console.error('Error getting next version suggestion:', error);
      return '1.0.0';
    }
  }

  /**
   * Check schema health and version consistency
   */
  static async checkSchemaHealth(): Promise<{
    version_table_exists: boolean;
    current_version: string | null;
    version_count: number;
    last_update: string | null;
    health_status: 'healthy' | 'warning' | 'error';
    issues: string[];
  }> {
    const issues: string[] = [];
    let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    try {
      // Check if version table exists and is accessible
      const { data, error } = await supabase
        .from('schema_version')
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        issues.push(`Schema version table error: ${error.message}`);
        healthStatus = 'error';
        
        return {
          version_table_exists: false,
          current_version: null,
          version_count: 0,
          last_update: null,
          health_status: healthStatus,
          issues
        };
      }

      const versionHistory = await this.getVersionHistory();
      
      // Check for issues
      if (versionHistory.total_versions === 0) {
        issues.push('No schema versions found - versioning not initialized');
        healthStatus = 'warning';
      }

      if (versionHistory.current_version && !this.isValidVersionFormat(versionHistory.current_version)) {
        issues.push(`Invalid version format: ${versionHistory.current_version}`);
        healthStatus = 'warning';
      }

      return {
        version_table_exists: true,
        current_version: versionHistory.current_version,
        version_count: versionHistory.total_versions,
        last_update: versionHistory.latest_update,
        health_status: healthStatus,
        issues
      };

    } catch (error) {
      issues.push(`Schema health check failed: ${error}`);
      
      return {
        version_table_exists: false,
        current_version: null,
        version_count: 0,
        last_update: null,
        health_status: 'error',
        issues
      };
    }
  }
}

export default SchemaVersionManager;