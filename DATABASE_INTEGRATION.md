# Database Integration for Document Signing

## Overview

This document outlines the comprehensive Supabase database integration for the SignTusk document signing application. The integration provides complete audit logging, document tracking, and compliance features.

## 🗄️ Database Schema

### Core Tables

#### 1. `documents` Table
Stores all document information and metadata.

```sql
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
    status VARCHAR(50) DEFAULT 'uploaded',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Status Values:**
- `uploaded` - Document uploaded to storage
- `previewed` - Document has been previewed by user
- `accepted` - User has accepted the document for signing
- `signed` - Document has been digitally signed
- `completed` - Signing process fully completed
- `rejected` - Document was rejected

#### 2. `document_signatures` Table
Records all signature information for documents.

```sql
CREATE TABLE document_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    signer_id VARCHAR(15) NOT NULL,
    signer_address VARCHAR(42) NOT NULL,
    signature TEXT NOT NULL,
    signature_type VARCHAR(50) DEFAULT 'single',
    signature_metadata JSONB,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. `audit_logs` Table
Comprehensive audit trail for all document operations.

```sql
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
```

**Audit Actions:**
- `DOCUMENT_UPLOADED` - Document uploaded to storage
- `DOCUMENT_PREVIEWED` - Document previewed by user
- `DOCUMENT_ACCEPTED` - Document accepted for signing
- `DOCUMENT_SIGNED` - Document digitally signed
- `DOCUMENT_VERIFIED` - Document signature verified
- `MULTI_SIGNATURE_INITIATED` - Multi-signature process started
- `SIGNER_ADDED` - Signer added to multi-signature document
- `SIGNATURE_REJECTED` - Signature process rejected

#### 4. Multi-Signature Support Tables

```sql
-- Multi-signature requests
CREATE TABLE multi_signature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    initiator_id VARCHAR(15) NOT NULL,
    initiator_address VARCHAR(42) NOT NULL,
    required_signers INTEGER NOT NULL,
    current_signers INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Required signers for multi-signature documents
CREATE TABLE required_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    multi_signature_request_id UUID REFERENCES multi_signature_requests(id) ON DELETE CASCADE,
    signer_id VARCHAR(15) NOT NULL,
    signer_address VARCHAR(42),
    status VARCHAR(50) DEFAULT 'pending',
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. `verification_attempts` Table
Tracks all document verification attempts.

```sql
CREATE TABLE verification_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    verifier_ip INET,
    verification_result BOOLEAN NOT NULL,
    verification_details JSONB,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 📊 Database Service Implementation

### DocumentDatabase Class

The `DocumentDatabase` class provides comprehensive database operations:

```typescript
export class DocumentDatabase {
  // Document operations
  static async createDocument(document: DocumentRecord): Promise<DocumentRecord>
  static async updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<DocumentRecord>
  static async getDocument(id: string): Promise<DocumentRecord | null>
  static async getDocumentsBySignerId(signerId: string): Promise<DocumentRecord[]>

  // Signature operations
  static async createSignature(signature: SignatureRecord): Promise<SignatureRecord>
  static async getDocumentSignatures(documentId: string): Promise<SignatureRecord[]>

  // Audit operations
  static async createAuditLog(auditLog: AuditLogRecord): Promise<AuditLogRecord>
  static async getDocumentAuditLogs(documentId: string): Promise<AuditLogRecord[]>
  static async getUserAuditLogs(userId: string): Promise<AuditLogRecord[]>

  // Multi-signature operations
  static async createMultiSignatureRequest(request: MultiSignatureRequestRecord): Promise<MultiSignatureRequestRecord>
  static async addRequiredSigner(signer: RequiredSignerRecord): Promise<RequiredSignerRecord>
  static async getPendingMultiSignatureRequests(signerId: string): Promise<any[]>

  // Verification operations
  static async recordVerificationAttempt(attempt: VerificationAttempt): Promise<void>

  // Statistics
  static async getDocumentStats(): Promise<DocumentStats>
}
```

### AuditLogger Class

Specialized audit logging with automatic metadata capture:

```typescript
export class AuditLogger {
  static async logDocumentUpload(documentId: string, userId: string, details: any, request?: Request): Promise<void>
  static async logDocumentPreview(documentId: string, userId: string, details: any, request?: Request): Promise<void>
  static async logDocumentAccepted(documentId: string, userId: string, details: any, request?: Request): Promise<void>
  static async logDocumentSigned(documentId: string, userId: string, details: any, request?: Request): Promise<void>
  static async logDocumentVerification(documentId: string, userId: string, details: any, request?: Request): Promise<void>
  static async logMultiSignatureInitiated(documentId: string, userId: string, details: any, request?: Request): Promise<void>
  static async logSignerAdded(documentId: string, userId: string, details: any, request?: Request): Promise<void>
  static async logSignatureRejected(documentId: string, userId: string, details: any, request?: Request): Promise<void>
}
```

## 🔄 Integration Workflow

### Document Signing Flow with Database Integration

#### Step 1: Upload Document
```typescript
// 1. Upload file to Supabase Storage
const { data, error, publicUrl } = await uploadFileToSupabase(file, 'documents', uploadPath);

// 2. Create document record in database
const documentRecord = await DocumentDatabase.createDocument({
  file_name: file.name,
  file_size: file.size,
  file_type: file.type,
  original_hash: hash,
  supabase_path: uploadPath,
  public_url: publicUrl,
  status: 'uploaded',
  metadata: { uploader_id: wallet.customId }
});

// 3. Log upload audit
await AuditLogger.logDocumentUpload(documentRecord.id, wallet.customId, {
  file_name: file.name,
  file_size: file.size,
  supabase_path: uploadPath
});
```

#### Step 2: Preview Document
```typescript
// 1. Update document status
await DocumentDatabase.updateDocument(currentDocumentId, {
  status: 'previewed'
});

// 2. Log preview audit
await AuditLogger.logDocumentPreview(currentDocumentId, wallet.customId, {
  preview_url: previewUrl,
  action: 'document_previewed'
});
```

#### Step 3: Accept Document
```typescript
// 1. Update document status and metadata
await DocumentDatabase.updateDocument(currentDocumentId, {
  status: 'accepted',
  metadata: {
    ...documentMetadata,
    accepted_at: new Date().toISOString()
  }
});

// 2. Log acceptance audit
await AuditLogger.logDocumentAccepted(currentDocumentId, wallet.customId, {
  document_metadata: documentMetadata,
  action: 'document_accepted'
});
```

#### Step 4: Sign Document
```typescript
// 1. Update document with signed information
await DocumentDatabase.updateDocument(currentDocumentId, {
  status: 'signed',
  signed_hash: newHash,
  signed_supabase_path: signedPath,
  signed_public_url: publicUrl
});

// 2. Create signature record
await DocumentDatabase.createSignature({
  document_id: currentDocumentId,
  signer_id: wallet.customId,
  signer_address: wallet.address,
  signature: signature,
  signature_type: 'single',
  signature_metadata: {
    signer_name: documentMetadata.signerInfo,
    signature_method: 'sign_insert',
    signed_hash: newHash,
    original_hash: documentHash
  }
});

// 3. Log signing audit
await AuditLogger.logDocumentSigned(currentDocumentId, wallet.customId, {
  signed_hash: newHash,
  signed_path: signedPath,
  signature_method: 'sign_insert'
});
```

## 🔍 Audit Trail Features

### Complete Activity Tracking

Every action in the document signing process is logged:

1. **Document Upload**
   - File metadata (name, size, type)
   - Storage path and URL
   - User information
   - Timestamp

2. **Document Preview**
   - Preview URL accessed
   - User agent and IP address
   - Duration of preview session

3. **Document Acceptance**
   - User confirmation details
   - Document metadata entered
   - Acceptance timestamp

4. **Document Signing**
   - Signature method used
   - Cryptographic signature details
   - Hash values (original and signed)
   - Signing timestamp

5. **Verification Attempts**
   - Verification results
   - Verifier information
   - Verification method used

### Audit Log Query Examples

```typescript
// Get all audit logs for a document
const auditLogs = await DocumentDatabase.getDocumentAuditLogs(documentId);

// Get all audit logs for a user
const userLogs = await DocumentDatabase.getUserAuditLogs(userId);

// Get document statistics
const stats = await DocumentDatabase.getDocumentStats();
```

## 🔐 Security & Compliance

### Row Level Security (RLS)

Supabase RLS policies ensure data isolation:

```sql
-- Users can only see their own documents
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (metadata->>'uploader_id' = auth.jwt() ->> 'sub');

-- Users can only insert their own documents
CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (metadata->>'uploader_id' = auth.jwt() ->> 'sub');
```

### Data Encryption

- **At Rest**: Supabase provides encryption at rest
- **In Transit**: All communications use TLS/SSL
- **Application Level**: Sensitive data can be encrypted before storage

### Compliance Features

1. **Immutable Audit Trail**: Audit logs cannot be modified
2. **Timestamp Integrity**: All timestamps are server-generated
3. **User Attribution**: Every action is tied to a specific user
4. **IP Tracking**: Source IP addresses are logged
5. **Data Retention**: Configurable retention policies

## 📈 Performance Optimization

### Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX idx_document_signatures_signer_id ON document_signatures(signer_id);
CREATE INDEX idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

### Query Optimization

- Use appropriate indexes for common queries
- Implement pagination for large result sets
- Use JSONB operators for metadata queries
- Leverage Supabase's built-in caching

## 🚀 Deployment Instructions

### 1. Database Setup

```bash
# Run the schema creation script
psql -h your-supabase-host -U postgres -d postgres -f database/schema.sql
```

### 2. Environment Configuration

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. RLS Policy Configuration

Configure Row Level Security policies based on your authentication system.

### 4. Backup Strategy

- Enable automated backups in Supabase
- Implement point-in-time recovery
- Regular audit log exports for compliance

## 📊 Monitoring & Analytics

### Key Metrics to Track

1. **Document Volume**
   - Documents uploaded per day/week/month
   - Documents signed vs. uploaded ratio
   - Average time from upload to signature

2. **User Activity**
   - Active signers per period
   - Most active users
   - Geographic distribution of signers

3. **System Performance**
   - Average upload time
   - Average signing time
   - Error rates and types

4. **Compliance Metrics**
   - Audit log completeness
   - Failed verification attempts
   - Data retention compliance

### Sample Analytics Queries

```sql
-- Documents signed per day
SELECT DATE(created_at) as date, COUNT(*) as documents_signed
FROM documents 
WHERE status = 'signed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Most active signers
SELECT metadata->>'uploader_id' as signer_id, COUNT(*) as documents_signed
FROM documents 
WHERE status = 'signed'
GROUP BY metadata->>'uploader_id'
ORDER BY documents_signed DESC
LIMIT 10;

-- Audit trail completeness
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY action
ORDER BY count DESC;
```

## 🔧 Maintenance & Operations

### Regular Maintenance Tasks

1. **Database Cleanup**
   - Archive old audit logs
   - Clean up orphaned records
   - Optimize database performance

2. **Storage Management**
   - Monitor storage usage
   - Implement lifecycle policies
   - Clean up temporary files

3. **Security Audits**
   - Review access logs
   - Update security policies
   - Monitor for suspicious activity

### Troubleshooting Common Issues

1. **Upload Failures**
   - Check storage quotas
   - Verify file permissions
   - Review error logs

2. **Database Connection Issues**
   - Check connection limits
   - Verify credentials
   - Monitor database performance

3. **Audit Log Gaps**
   - Verify logging configuration
   - Check for application errors
   - Review database constraints

## 📝 API Documentation

### Document Operations

```typescript
// Create document
POST /api/documents
{
  "file_name": "contract.pdf",
  "file_size": 1024000,
  "file_type": "application/pdf",
  "original_hash": "sha256hash",
  "supabase_path": "documents/user123/contract.pdf"
}

// Get document
GET /api/documents/{id}

// Update document
PATCH /api/documents/{id}
{
  "status": "signed",
  "signed_hash": "newsha256hash"
}

// Get user documents
GET /api/documents?signer_id=user123
```

### Audit Operations

```typescript
// Get document audit trail
GET /api/audit/{document_id}

// Get user audit logs
GET /api/audit/user/{user_id}

// Create audit log entry
POST /api/audit
{
  "document_id": "uuid",
  "user_id": "user123",
  "action": "DOCUMENT_SIGNED",
  "details": { "method": "sign_insert" }
}
```

This comprehensive database integration provides a robust foundation for document signing with complete audit trails, compliance features, and scalable architecture.