import { supabase } from './supabase-storage';

// Export supabase for use in API routes
export { supabase };

// Types for database operations
export interface DocumentRecord {
  id?: string;
  file_name: string;
  file_size: number;
  file_type: string;
  original_hash: string;
  signed_hash?: string;
  supabase_path: string;
  signed_supabase_path?: string;
  public_url?: string;
  signed_public_url?: string;
  status: 'uploaded' | 'previewed' | 'accepted' | 'signed' | 'completed' | 'rejected';
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface SignatureRecord {
  id?: string;
  document_id: string;
  signer_id: string;
  signer_address: string;
  signature: string;
  signature_type: 'single' | 'multi';
  signature_metadata?: any;
  signed_at?: string;
  created_at?: string;
}

export interface AuditLogRecord {
  id?: string;
  document_id?: string;
  user_id?: string;
  action: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
}

export interface MultiSignatureRequestRecord {
  id?: string;
  document_id: string;
  initiator_id: string;
  initiator_address: string;
  required_signers: number;
  current_signers?: number;
  status: 'pending' | 'completed' | 'rejected';
  created_at?: string;
  completed_at?: string;
}

export interface RequiredSignerRecord {
  id?: string;
  multi_signature_request_id: string;
  signer_id: string;
  signer_address?: string;
  status: 'pending' | 'signed' | 'rejected';
  signed_at?: string;
  created_at?: string;
}

/**
 * Database service for document signing operations
 */
export class DocumentDatabase {
  
  /**
   * Create a new document record
   */
  static async createDocument(document: Omit<DocumentRecord, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentRecord> {
    const { data, error } = await supabase
      .from('documents')
      .insert([document])
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      throw new Error(`Failed to create document: ${error.message}`);
    }

    return data;
  }

  /**
   * Update document record
   */
  static async updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<DocumentRecord> {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      throw new Error(`Failed to update document: ${error.message}`);
    }

    return data;
  }

  /**
   * Get document by ID
   */
  static async getDocument(id: string): Promise<DocumentRecord | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Document not found
      }
      console.error('Error getting document:', error);
      throw new Error(`Failed to get document: ${error.message}`);
    }

    return data;
  }

  /**
   * Get documents by signer ID
   */
  static async getDocumentsBySignerId(signerId: string): Promise<DocumentRecord[]> {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_signatures!inner(signer_id)
      `)
      .eq('document_signatures.signer_id', signerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting documents by signer:', error);
      throw new Error(`Failed to get documents: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create signature record
   */
  static async createSignature(signature: Omit<SignatureRecord, 'id' | 'created_at'>): Promise<SignatureRecord> {
    const { data, error } = await supabase
      .from('document_signatures')
      .insert([signature])
      .select()
      .single();

    if (error) {
      console.error('Error creating signature:', error);
      throw new Error(`Failed to create signature: ${error.message}`);
    }

    return data;
  }

  /**
   * Get signatures for a document
   */
  static async getDocumentSignatures(documentId: string): Promise<SignatureRecord[]> {
    const { data, error } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('document_id', documentId)
      .order('signed_at', { ascending: true });

    if (error) {
      console.error('Error getting signatures:', error);
      throw new Error(`Failed to get signatures: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create audit log entry
   */
  static async createAuditLog(auditLog: Omit<AuditLogRecord, 'id' | 'timestamp'>): Promise<AuditLogRecord> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([auditLog])
      .select()
      .single();

    if (error) {
      console.error('Error creating audit log:', error);
      throw new Error(`Failed to create audit log: ${error.message}`);
    }

    return data;
  }

  /**
   * Get audit logs for a document
   */
  static async getDocumentAuditLogs(documentId: string): Promise<AuditLogRecord[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('document_id', documentId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error getting audit logs:', error);
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get audit logs for a user
   */
  static async getUserAuditLogs(userId: string): Promise<AuditLogRecord[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error getting user audit logs:', error);
      throw new Error(`Failed to get user audit logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create multi-signature request
   */
  static async createMultiSignatureRequest(request: Omit<MultiSignatureRequestRecord, 'id' | 'created_at'>): Promise<MultiSignatureRequestRecord> {
    const { data, error } = await supabase
      .from('multi_signature_requests')
      .insert([request])
      .select()
      .single();

    if (error) {
      console.error('Error creating multi-signature request:', error);
      throw new Error(`Failed to create multi-signature request: ${error.message}`);
    }

    return data;
  }

  /**
   * Update multi-signature request
   */
  static async updateMultiSignatureRequest(id: string, updates: Partial<MultiSignatureRequestRecord>): Promise<MultiSignatureRequestRecord> {
    const { data, error } = await supabase
      .from('multi_signature_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating multi-signature request:', error);
      throw new Error(`Failed to update multi-signature request: ${error.message}`);
    }

    return data;
  }

  /**
   * Add required signer
   */
  static async addRequiredSigner(signer: Omit<RequiredSignerRecord, 'id' | 'created_at'>): Promise<RequiredSignerRecord> {
    const { data, error } = await supabase
      .from('required_signers')
      .insert([signer])
      .select()
      .single();

    if (error) {
      console.error('Error adding required signer:', error);
      throw new Error(`Failed to add required signer: ${error.message}`);
    }

    return data;
  }

  /**
   * Update required signer status
   */
  static async updateRequiredSigner(id: string, updates: Partial<RequiredSignerRecord>): Promise<RequiredSignerRecord> {
    const { data, error } = await supabase
      .from('required_signers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating required signer:', error);
      throw new Error(`Failed to update required signer: ${error.message}`);
    }

    return data;
  }

  /**
   * Get required signers for a multi-signature request
   */
  static async getRequiredSigners(multiSignatureRequestId: string): Promise<RequiredSignerRecord[]> {
    const { data, error } = await supabase
      .from('required_signers')
      .select('*')
      .eq('multi_signature_request_id', multiSignatureRequestId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting required signers:', error);
      throw new Error(`Failed to get required signers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get pending multi-signature requests for a signer
   */
  static async getPendingMultiSignatureRequests(signerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('multi_signature_requests')
      .select(`
        *,
        documents(*),
        required_signers!inner(*)
      `)
      .eq('required_signers.signer_id', signerId)
      .eq('required_signers.status', 'pending')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting pending requests:', error);
      throw new Error(`Failed to get pending requests: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Record verification attempt
   */
  static async recordVerificationAttempt(attempt: {
    document_id: string;
    verifier_ip?: string;
    verification_result: boolean;
    verification_details?: any;
  }): Promise<void> {
    const { error } = await supabase
      .from('verification_attempts')
      .insert([attempt]);

    if (error) {
      console.error('Error recording verification attempt:', error);
      throw new Error(`Failed to record verification attempt: ${error.message}`);
    }
  }

  /**
   * Get document statistics
   */
  static async getDocumentStats(): Promise<{
    total_documents: number;
    signed_documents: number;
    pending_documents: number;
    total_signatures: number;
  }> {
    const [documentsResult, signaturesResult] = await Promise.all([
      supabase
        .from('documents')
        .select('status', { count: 'exact' }),
      supabase
        .from('document_signatures')
        .select('id', { count: 'exact' })
    ]);

    if (documentsResult.error || signaturesResult.error) {
      throw new Error('Failed to get document statistics');
    }

    const documents = documentsResult.data || [];
    const total_documents = documentsResult.count || 0;
    const signed_documents = documents.filter(d => d.status === 'signed' || d.status === 'completed').length;
    const pending_documents = documents.filter(d => d.status === 'uploaded' || d.status === 'previewed' || d.status === 'accepted').length;
    const total_signatures = signaturesResult.count || 0;

    return {
      total_documents,
      signed_documents,
      pending_documents,
      total_signatures
    };
  }
}

/**
 * Utility functions for audit logging
 */
export class AuditLogger {
  
  static async logDocumentUpload(documentId: string, userId: string, details: any, request?: Request): Promise<void> {
    await DocumentDatabase.createAuditLog({
      document_id: documentId,
      user_id: userId,
      action: 'DOCUMENT_UPLOADED',
      details,
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined
    });
  }

  static async logDocumentPreview(documentId: string, userId: string, details: any, request?: Request): Promise<void> {
    await DocumentDatabase.createAuditLog({
      document_id: documentId,
      user_id: userId,
      action: 'DOCUMENT_PREVIEWED',
      details,
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined
    });
  }

  static async logDocumentAccepted(documentId: string, userId: string, details: any, request?: Request): Promise<void> {
    await DocumentDatabase.createAuditLog({
      document_id: documentId,
      user_id: userId,
      action: 'DOCUMENT_ACCEPTED',
      details,
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined
    });
  }

  static async logDocumentSigned(documentId: string, userId: string, details: any, request?: Request): Promise<void> {
    await DocumentDatabase.createAuditLog({
      document_id: documentId,
      user_id: userId,
      action: 'DOCUMENT_SIGNED',
      details,
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined
    });
  }

  static async logDocumentVerification(documentId: string, userId: string, details: any, request?: Request): Promise<void> {
    await DocumentDatabase.createAuditLog({
      document_id: documentId,
      user_id: userId,
      action: 'DOCUMENT_VERIFIED',
      details,
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined
    });
  }

  static async logMultiSignatureInitiated(documentId: string, userId: string, details: any, request?: Request): Promise<void> {
    await DocumentDatabase.createAuditLog({
      document_id: documentId,
      user_id: userId,
      action: 'MULTI_SIGNATURE_INITIATED',
      details,
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined
    });
  }

  static async logSignerAdded(documentId: string, userId: string, details: any, request?: Request): Promise<void> {
    await DocumentDatabase.createAuditLog({
      document_id: documentId,
      user_id: userId,
      action: 'SIGNER_ADDED',
      details,
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined
    });
  }

  static async logSignatureRejected(documentId: string, userId: string, details: any, request?: Request): Promise<void> {
    await DocumentDatabase.createAuditLog({
      document_id: documentId,
      user_id: userId,
      action: 'SIGNATURE_REJECTED',
      details,
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined
    });
  }

  private static getClientIP(request?: Request): string | undefined {
    if (!request) return undefined;
    
    // Try to get IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.headers.get('x-client-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || clientIP || undefined;
  }
}

export default DocumentDatabase;