-- Supabase Database Schema for SignTusk Document Signing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Documents table to store document information
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    original_hash VARCHAR(64) NOT NULL,
    signed_hash VARCHAR(64),
    supabase_path VARCHAR(500) NOT NULL,
    signed_supabase_path VARCHAR(500),
    public_url TEXT,
    signed_public_url TEXT,
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'previewed', 'accepted', 'signed', 'completed', 'rejected')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document signatures table to store signature information
CREATE TABLE document_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    signer_id VARCHAR(15) NOT NULL,
    signer_address VARCHAR(42) NOT NULL,
    signature TEXT NOT NULL,
    signature_type VARCHAR(50) DEFAULT 'single' CHECK (signature_type IN ('single', 'multi')),
    signature_metadata JSONB,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table for comprehensive tracking
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id VARCHAR(15),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-signature requests table
CREATE TABLE multi_signature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    initiator_id VARCHAR(15) NOT NULL,
    initiator_address VARCHAR(42) NOT NULL,
    required_signers INTEGER NOT NULL,
    current_signers INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Required signers for multi-signature documents
CREATE TABLE required_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    multi_signature_request_id UUID REFERENCES multi_signature_requests(id) ON DELETE CASCADE,
    signer_id VARCHAR(15) NOT NULL,
    signer_address VARCHAR(42),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected')),
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification attempts table
CREATE TABLE verification_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    verifier_ip INET,
    verification_result BOOLEAN NOT NULL,
    verification_details JSONB,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX idx_document_signatures_signer_id ON document_signatures(signer_id);
CREATE INDEX idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_multi_signature_requests_status ON multi_signature_requests(status);
CREATE INDEX idx_required_signers_signer_id ON required_signers(signer_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for documents table
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE required_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - can be customized based on requirements)
-- Allow users to see their own documents
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (true); -- Adjust based on user identification

-- Allow users to insert their own documents
CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (true); -- Adjust based on user identification

-- Allow users to update their own documents
CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (true); -- Adjust based on user identification

-- Similar policies for other tables
CREATE POLICY "Users can view signatures" ON document_signatures
    FOR SELECT USING (true);

CREATE POLICY "Users can insert signatures" ON document_signatures
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view audit logs" ON audit_logs
    FOR SELECT USING (true);

CREATE POLICY "Users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Grant permissions to authenticated users
GRANT ALL ON documents TO authenticated;
GRANT ALL ON document_signatures TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON multi_signature_requests TO authenticated;
GRANT ALL ON required_signers TO authenticated;
GRANT ALL ON verification_attempts TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;