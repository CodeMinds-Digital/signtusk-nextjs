-- Reset All Data Script for SignTusk Database
-- This script truncates all tables and resets sequences while preserving schema structure
-- Based on complete_schema_fixed.sql
-- 
-- WARNING: This will DELETE ALL DATA in the database!
-- Use with caution - only for development/testing environments

-- ============================================================================
-- DISABLE TRIGGERS AND CONSTRAINTS TEMPORARILY
-- ============================================================================

-- Disable all triggers to avoid issues during truncation
SET session_replication_role = replica;

-- ============================================================================
-- TRUNCATE ALL TABLES (Order matters due to foreign key constraints)
-- ============================================================================

-- Start with tables that have no dependencies (leaf tables)
TRUNCATE TABLE verification_attempts CASCADE;
TRUNCATE TABLE required_signers CASCADE;
TRUNCATE TABLE multi_signature_requests CASCADE;
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE document_signatures CASCADE;
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE auth_sessions CASCADE;
TRUNCATE TABLE challenges CASCADE;
TRUNCATE TABLE wallets CASCADE;
TRUNCATE TABLE user_profiles CASCADE;

-- Truncate schema version table (will be repopulated)
TRUNCATE TABLE schema_version CASCADE;

-- ============================================================================
-- RESET SEQUENCES
-- ============================================================================

-- Note: PostgreSQL UUID sequences don't need resetting as they use uuid_generate_v4()
-- But if there were any SERIAL columns, we would reset them here like:
-- ALTER SEQUENCE table_name_id_seq RESTART WITH 1;

-- ============================================================================
-- RE-ENABLE TRIGGERS AND CONSTRAINTS
-- ============================================================================

-- Re-enable all triggers
SET session_replication_role = DEFAULT;

-- ============================================================================
-- REPOPULATE ESSENTIAL DATA
-- ============================================================================

-- Re-insert schema version
INSERT INTO schema_version (version, description) 
VALUES ('1.1.0', 'Complete SignTusk schema with user identity management, document signing system, and challenges table');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables are empty
DO $$
DECLARE
    table_name TEXT;
    row_count INTEGER;
    total_rows INTEGER := 0;
BEGIN
    -- List of all main tables to check
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'user_profiles',
            'wallets', 
            'challenges',
            'auth_sessions',
            'documents',
            'document_signatures',
            'audit_logs',
            'multi_signature_requests',
            'required_signers',
            'verification_attempts'
        ])
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
        total_rows := total_rows + row_count;
        
        IF row_count > 0 THEN
            RAISE NOTICE 'Table % still has % rows', table_name, row_count;
        ELSE
            RAISE NOTICE 'Table % is empty ✓', table_name;
        END IF;
    END LOOP;
    
    -- Check schema_version table separately (should have 1 row)
    SELECT COUNT(*) INTO row_count FROM schema_version;
    RAISE NOTICE 'Schema version table has % rows (should be 1)', row_count;
    
    -- Final summary
    IF total_rows = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All data tables are empty. Database reset complete!';
    ELSE
        RAISE NOTICE '❌ WARNING: % rows still exist in data tables', total_rows;
    END IF;
END $$;

-- ============================================================================
-- SHOW CURRENT STATE
-- ============================================================================

-- Show table sizes after reset
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_stat_get_tuples_returned(c.oid) as rows_read,
    pg_stat_get_tuples_inserted(c.oid) as rows_inserted
FROM pg_tables pt
JOIN pg_class c ON c.relname = pt.tablename
WHERE schemaname = 'public' 
    AND tablename IN (
        'user_profiles',
        'wallets',
        'challenges', 
        'auth_sessions',
        'documents',
        'document_signatures',
        'audit_logs',
        'multi_signature_requests',
        'required_signers',
        'verification_attempts',
        'schema_version'
    )
ORDER BY tablename;

-- Show current schema version
SELECT * FROM schema_version;

-- ============================================================================
-- CLEANUP FUNCTIONS (Optional)
-- ============================================================================

-- Function to reset all data (can be called anytime)
CREATE OR REPLACE FUNCTION reset_all_data()
RETURNS TEXT AS $$
DECLARE
    result_text TEXT;
BEGIN
    -- Disable triggers
    SET session_replication_role = replica;
    
    -- Truncate all tables
    TRUNCATE TABLE verification_attempts CASCADE;
    TRUNCATE TABLE required_signers CASCADE;
    TRUNCATE TABLE multi_signature_requests CASCADE;
    TRUNCATE TABLE audit_logs CASCADE;
    TRUNCATE TABLE document_signatures CASCADE;
    TRUNCATE TABLE documents CASCADE;
    TRUNCATE TABLE auth_sessions CASCADE;
    TRUNCATE TABLE challenges CASCADE;
    TRUNCATE TABLE wallets CASCADE;
    TRUNCATE TABLE user_profiles CASCADE;
    TRUNCATE TABLE schema_version CASCADE;
    
    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
    
    -- Re-insert schema version
    INSERT INTO schema_version (version, description) 
    VALUES ('1.1.0', 'Complete SignTusk schema - data reset at ' || NOW());
    
    result_text := 'All data has been reset successfully at ' || NOW();
    
    -- Log the reset action
    INSERT INTO audit_logs (action, details, timestamp)
    VALUES ('SYSTEM_RESET', '{"action": "reset_all_data", "timestamp": "' || NOW() || '"}', NOW());
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on reset function
GRANT EXECUTE ON FUNCTION reset_all_data() TO authenticated;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
USAGE INSTRUCTIONS:

1. To reset all data manually:
   Run this entire script in your PostgreSQL client

2. To reset data using the function:
   SELECT reset_all_data();

3. To verify reset was successful:
   SELECT tablename, n_tup_ins as inserts, n_tup_del as deletes 
   FROM pg_stat_user_tables 
   WHERE schemaname = 'public';

4. To check table sizes:
   SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename)) as size
   FROM pg_tables 
   WHERE schemaname = 'public';

IMPORTANT NOTES:
- This script preserves the database schema (tables, functions, indexes, etc.)
- Only data is removed, not structure
- Schema version is reset to current version
- All foreign key constraints are handled properly
- Triggers are temporarily disabled during reset
- An audit log entry is created after reset

SAFETY:
- Only use in development/testing environments
- Always backup your database before running
- Verify you're connected to the correct database
- This action cannot be undone without a backup
*/
