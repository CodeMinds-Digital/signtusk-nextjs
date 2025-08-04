-- Multi-Signature Sequential Signing Migration (PostgreSQL Safe Version)
-- This migration adds support for sequential signing workflow
-- Safe for all PostgreSQL versions

BEGIN;

-- Add fields to multi_signature_requests table for sequential signing
DO $$
BEGIN
    -- Add description column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'multi_signature_requests' AND column_name = 'description'
    ) THEN
        ALTER TABLE multi_signature_requests ADD COLUMN description TEXT;
    END IF;

    -- Add current_signer_index column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'multi_signature_requests' AND column_name = 'current_signer_index'
    ) THEN
        ALTER TABLE multi_signature_requests ADD COLUMN current_signer_index INTEGER DEFAULT 0;
    END IF;

    -- Add signing_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'multi_signature_requests' AND column_name = 'signing_type'
    ) THEN
        ALTER TABLE multi_signature_requests ADD COLUMN signing_type VARCHAR(20) DEFAULT 'sequential';
        ALTER TABLE multi_signature_requests ADD CONSTRAINT check_signing_type 
        CHECK (signing_type IN ('sequential', 'parallel'));
    END IF;
END $$;

-- Add fields to required_signers table for signing order
DO $$
BEGIN
    -- Add signing_order column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'required_signers' AND column_name = 'signing_order'
    ) THEN
        ALTER TABLE required_signers ADD COLUMN signing_order INTEGER DEFAULT 0;
    END IF;

    -- Add signature column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'required_signers' AND column_name = 'signature'
    ) THEN
        ALTER TABLE required_signers ADD COLUMN signature TEXT;
    END IF;

    -- Add signature_metadata column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'required_signers' AND column_name = 'signature_metadata'
    ) THEN
        ALTER TABLE required_signers ADD COLUMN signature_metadata JSONB;
    END IF;
END $$;

-- Update existing records to have signing_order = 0 if NULL
UPDATE required_signers SET signing_order = 0 WHERE signing_order IS NULL;

-- Add NOT NULL constraint to signing_order safely
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'required_signers' 
        AND column_name = 'signing_order' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE required_signers ALTER COLUMN signing_order SET NOT NULL;
    END IF;
END $$;

-- Create indexes safely
DO $$
BEGIN
    -- Index for efficient ordering queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_required_signers_order'
    ) THEN
        CREATE INDEX idx_required_signers_order 
        ON required_signers(multi_signature_request_id, signing_order);
    END IF;

    -- Index for efficient status queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_required_signers_status'
    ) THEN
        CREATE INDEX idx_required_signers_status 
        ON required_signers(multi_signature_request_id, status);
    END IF;

    -- Index for efficient current signer queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_multi_signature_current_signer'
    ) THEN
        CREATE INDEX idx_multi_signature_current_signer 
        ON multi_signature_requests(id, current_signer_index);
    END IF;
END $$;

-- Add unique constraint safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_signing_order_per_request'
    ) THEN
        ALTER TABLE required_signers 
        ADD CONSTRAINT unique_signing_order_per_request 
        UNIQUE (multi_signature_request_id, signing_order);
    END IF;
END $$;

-- Function to get current signer for a multi-signature request
CREATE OR REPLACE FUNCTION get_current_signer(request_id UUID)
RETURNS TABLE (
    signer_id VARCHAR(15),
    signer_custom_id VARCHAR(15),
    signing_order INTEGER,
    status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.signer_id,
        rs.signer_custom_id,
        rs.signing_order,
        rs.status
    FROM required_signers rs
    JOIN multi_signature_requests msr ON rs.multi_signature_request_id = msr.id
    WHERE msr.id = request_id 
    AND rs.signing_order = msr.current_signer_index
    AND rs.status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Function to advance to next signer
CREATE OR REPLACE FUNCTION advance_to_next_signer(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    next_signer_exists BOOLEAN := FALSE;
    current_index INTEGER;
BEGIN
    -- Get current signer index
    SELECT current_signer_index INTO current_index
    FROM multi_signature_requests
    WHERE id = request_id;
    
    -- Check if there's a next signer
    SELECT EXISTS(
        SELECT 1 FROM required_signers
        WHERE multi_signature_request_id = request_id
        AND signing_order = current_index + 1
        AND status = 'pending'
    ) INTO next_signer_exists;
    
    -- If next signer exists, advance the index
    IF next_signer_exists THEN
        UPDATE multi_signature_requests
        SET current_signer_index = current_index + 1
        WHERE id = request_id;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if all signers have completed
CREATE OR REPLACE FUNCTION check_all_signers_completed(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_signers INTEGER;
    completed_signers INTEGER;
BEGIN
    -- Count total required signers
    SELECT COUNT(*) INTO total_signers
    FROM required_signers
    WHERE multi_signature_request_id = request_id;
    
    -- Count completed signers
    SELECT COUNT(*) INTO completed_signers
    FROM required_signers
    WHERE multi_signature_request_id = request_id
    AND status = 'signed';
    
    RETURN total_signers = completed_signers AND total_signers > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to complete multi-signature request
CREATE OR REPLACE FUNCTION complete_multi_signature_request(request_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if all signers have completed
    IF check_all_signers_completed(request_id) THEN
        UPDATE multi_signature_requests
        SET 
            status = 'completed',
            completed_at = NOW(),
            current_signers = required_signers
        WHERE id = request_id;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Update schema version safely
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_version') THEN
        INSERT INTO schema_version (version, description) 
        VALUES ('2.1.0', 'Added sequential multi-signature signing support')
        ON CONFLICT (version) DO UPDATE SET 
            applied_at = NOW(),
            description = EXCLUDED.description;
    END IF;
END $$;

-- Add helpful comments
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'multi_signature_requests' AND column_name = 'description'
    ) THEN
        COMMENT ON COLUMN multi_signature_requests.description IS 'Optional description for the multi-signature request';
        COMMENT ON COLUMN multi_signature_requests.current_signer_index IS 'Index of the current signer in the signing order (0-based)';
        COMMENT ON COLUMN multi_signature_requests.signing_type IS 'Type of signing workflow: sequential or parallel';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'required_signers' AND column_name = 'signing_order'
    ) THEN
        COMMENT ON COLUMN required_signers.signing_order IS 'Order in which this signer should sign (0-based)';
        COMMENT ON COLUMN required_signers.signature IS 'Digital signature provided by the signer';
        COMMENT ON COLUMN required_signers.signature_metadata IS 'Additional metadata about the signature';
    END IF;
END $$;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Multi-signature sequential signing migration completed successfully!';
    RAISE NOTICE 'New features added:';
    RAISE NOTICE '- Sequential signing workflow support';
    RAISE NOTICE '- Real-time signer tracking';
    RAISE NOTICE '- Enhanced signature metadata';
    RAISE NOTICE '- Optimized database indexes';
    RAISE NOTICE 'All existing single-signature functionality preserved.';
END $$;
