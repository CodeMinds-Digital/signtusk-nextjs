# SignTusk Database Schema Documentation

## Overview
The `complete_schema_with_zero_trust.sql` file is the definitive database schema for SignTusk, combining all features from multiple schema files into one comprehensive setup.

## What's Included

### 📁 **Combined Files:**
- ✅ `complete_schema_fixed.sql` - Base user identity and document signing system
- ✅ `migrate_custom_id_to_18_chars.sql` - 18-character Custom ID support  
- ✅ `zero_trust_schema_updates.sql` - Zero Trust security features

### 🔧 **Schema Version:** 2.0.0

## Key Features

### 🆔 **18-Character Custom IDs**
- **Format**: Random alphanumeric (A-Z, 0-9)
- **Length**: 18 characters
- **Example**: `XZ9A93BF12DE3QWA1E`
- **Uniqueness**: Database-enforced with automatic generation

### 🔐 **Zero Trust Security**
- **Security Levels**: Standard, Enhanced, Maximum
- **Encryption Versions**: v1 (standard), v2 (enhanced), v3 (maximum)
- **Steganography Support**: LSB steganography for maximum security
- **Device Trust Tracking**: Monitor and track device access patterns
- **Security Event Logging**: Comprehensive audit trail

### 📊 **Core Tables (15 total)**

#### **User Identity Management:**
1. `user_profiles` - User accounts with 18-char Custom IDs
2. `wallets` - Wallet storage with Zero Trust security fields
3. `challenges` - Authentication challenges
4. `auth_sessions` - Session management with security context

#### **Document Signing System:**
5. `documents` - Document storage and metadata
6. `document_signatures` - Digital signatures
7. `multi_signature_requests` - Multi-party signing workflows
8. `required_signers` - Signer requirements for multi-sig

#### **Zero Trust Security:**
9. `security_events` - Security event audit log
10. `security_configurations` - User security preferences
11. `device_trust_levels` - Device trust management

#### **Audit & Verification:**
12. `audit_logs` - General system audit trail
13. `verification_attempts` - Document verification tracking
14. `schema_version` - Database version tracking

## Database Functions

### 🔧 **Core Functions:**
- `generate_custom_id()` - Generate unique 18-character IDs
- `create_user_with_wallet()` - Create user with wallet
- `get_user_by_wallet_address()` - Retrieve user by wallet
- `update_last_login()` - Update login timestamp
- `get_user_document_summary()` - Get user's document stats

### 🛡️ **Zero Trust Functions:**
- `log_security_event()` - Log security events
- `update_wallet_security_level()` - Upgrade security levels
- `get_security_statistics()` - Get system security stats

### 🧹 **Maintenance Functions:**
- `cleanup_expired_challenges()` - Clean expired auth challenges
- `cleanup_expired_sessions()` - Clean expired sessions
- `archive_old_security_events()` - Archive old security logs

## Security Features

### 🔒 **Row Level Security (RLS)**
- Enabled on sensitive tables
- Users can only access their own data
- Policy-based access control

### 🎯 **Automatic Auditing**
- Triggers for wallet security changes
- Automatic timestamp updates
- Security event logging

### 👥 **Role-Based Access**
- `signtusk_app` - Application access
- `signtusk_readonly` - Read-only access  
- `signtusk_admin` - Full administrative access

## Performance Optimizations

### 📈 **Indexes (20+ total)**
- Custom ID lookups
- Wallet address searches
- Security event queries
- Document status filtering
- Timestamp-based queries

## Usage Instructions

### 🚀 **Fresh Installation:**
```sql
-- Run the complete schema file
\i complete_schema_with_zero_trust.sql
```

### 🔄 **Migration from Old Schema:**
```sql
-- If you have existing data, run migration first
\i migrate_custom_id_to_18_chars.sql

-- Then apply Zero Trust updates
\i zero_trust_schema_updates.sql
```

### 🧹 **Reset All Data:**
```sql
-- Use the reset script to clear all data
\i reset_all_data.sql
```

## Verification

After running the schema, verify setup:

```sql
-- Check schema version
SELECT * FROM schema_version;

-- Check table count
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Check security statistics
SELECT * FROM get_security_statistics();
```

## Expected Results:
- ✅ **15 tables** created
- ✅ **20+ indexes** for performance
- ✅ **10+ functions** for operations
- ✅ **Triggers** for automatic auditing
- ✅ **RLS policies** for security
- ✅ **Schema version 2.0.0** recorded

## File Structure

```
database/
├── complete_schema_with_zero_trust.sql  ← **USE THIS FILE**
├── complete_schema_fixed.sql            ← Legacy (included above)
├── migrate_custom_id_to_18_chars.sql    ← Legacy (included above)
├── zero_trust_schema_updates.sql        ← Legacy (included above)
├── reset_all_data.sql                   ← Data reset utility
└── README_SCHEMA.md                     ← This documentation
```

## Important Notes

### ⚠️ **Production Considerations:**
- Always backup before running schema changes
- Test in development environment first
- Review RLS policies for your authentication system
- Adjust maintenance function schedules
- Monitor security event logs

### 🔧 **Customization:**
- Modify RLS policies based on your auth system
- Adjust security event retention periods
- Configure automatic cleanup schedules
- Add custom security configurations

### 📊 **Monitoring:**
- Monitor security event patterns
- Track security level adoption
- Review device trust patterns
- Audit failed authentication attempts

## Support

This schema supports:
- ✅ Multiple security levels (Standard/Enhanced/Maximum)
- ✅ 18-character unique Custom IDs
- ✅ Zero Trust security architecture
- ✅ Document signing workflows
- ✅ Multi-signature support
- ✅ Comprehensive auditing
- ✅ Device trust management
- ✅ Steganography support
- ✅ Performance optimization
- ✅ Security compliance

The schema is production-ready and includes all necessary features for the SignTusk application with Zero Trust security implementation.
