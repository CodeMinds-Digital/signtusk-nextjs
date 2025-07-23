# Model-Based Steps for Document Signing

This document outlines the step-by-step processes for different document signing models, aligning them with the services required for implementation.

---

## 1. Off-Chain Document Signing

### 1.1. Single Signature

**Description:** Signing a document off-chain with a single digital signature.

**Steps:**
1.  **Register and Verify User Identity:**
    *   **Services:** Identity Provider/Management.
2.  **Upload/Prepare Document:**
    *   **Services:** Web Application, Document Service.
3.  **Generate Document Hash and Sign:**
    *   **Services:** Document Service, Digital Wallet/Key Management.
4.  **Store Document and Signature Off-Chain:**
    *   **Services:** Secure Off-Chain Storage, Database.
5.  **Serve Verification Tools:**
    *   **Services:** Web Application, Document Service.

### 1.2. Multi-Signature

**Description:** Signing a document off-chain with multiple digital signatures.

**Steps:**
1.  **Initiate Document and Define Signers:**
    *   **Services:** Web Application, Document Service.
2.  **Generate Document Hash:**
    *   **Services:** Document Service.
3.  **Collect Signatures Sequentially or in Parallel:**
    *   **Services:** Notification Service, Web Application, Digital Wallet/Key Management.
4.  **Store Individual Signatures:**
    *   **Services:** Database.
5.  **Aggregate Signatures and Finalize:**
    *   **Services:** Document Service.
6.  **Store Final Document and Provide Verification:**
    *   **Services:** Secure Off-Chain Storage, Database, Web Application.

---

## 2. Blockchain-Anchored Signing

### 2.1. Single Signature

**Description:** A hybrid approach combining off-chain storage with on-chain anchoring for a single-signature document.

**Steps:**
1.  **Register and Prepare Document:**
    *   **Services:** Identity Provider/Management, Web Application.
2.  **Generate Document Hash:**
    *   **Services:** Application Logic.
3.  **Sign the Hash Off-Chain:**
    *   **Services:** Digital Wallet/Key Management.
4.  **Store Document and Signature Off-Chain:**
    *   **Services:** Secure Off-Chain Storage.
5.  **Anchor Hash On-Chain:**
    *   **Services:** Blockchain.
6.  **Provide Verification Tools:**
    *   **Services:** Web Application.

### 2.2. Multi-Signature

**Description:** Securing a document with multiple signatures and anchoring it to a public blockchain.

**Steps:**
1.  **Initiate Document and Define Signers:**
    *   **Services:** Web Application.
2.  **Generate and Distribute Document Hash:**
    *   **Services:** Application Logic.
3.  **Collect Signatures and Create Proof Hash:**
    *   **Services:** Digital Wallet/Key Management, Application Logic.
4.  **Store Document and Signatures Off-Chain:**
    *   **Services:** Secure Off-Chain Storage.
5.  **Anchor Proof Hash On-Chain:**
    *   **Services:** Blockchain.
6.  **Provide Comprehensive Verification Tools:**
    *   **Services:** Web Application.

---

## 3. On-Chain Signing

### 3.1. Single Signature

**Description:** Every step of the signing process is recorded on-chain for a single-signature document.

**Steps:**
1.  **Register and Verify User Identity:**
    *   **Services:** Identity Provider/Management.
2.  **Upload and Prepare Document:**
    *   **Services:** Web Application, Secure Off-Chain Storage (e.g., IPFS).
3.  **Generate Document Hash:**
    *   **Services:** Application Logic.
4.  **Sign Document Hash Using Private Key:**
    *   **Services:** Digital Wallet/Key Management.
5.  **Record Signature and Document Hash On-Chain:**
    *   **Services:** Blockchain, Smart Contracts.
6.  **Maintain Immutable On-Chain Audit Trail:**
    *   **Services:** Blockchain.
7.  **Serve Verification Tools:**
    *   **Services:** Web Application.

### 3.2. Multi-Signature

**Description:** All required signatures are collected and recorded on-chain.

**Steps:**
1.  **Register and Verify User Identities:**
    *   **Services:** Identity Provider/Management.
2.  **Upload and Prepare Document:**
    *   **Services:** Web Application, Secure Off-Chain Storage (e.g., IPFS).
3.  **Initiate Multi-Signature Request:**
    *   **Services:** Smart Contracts.
4.  **First Signatory Signs Document Hash:**
    *   **Services:** Digital Wallet/Key Management, Smart Contracts.
5.  **Subsequent Signatories Sign Document Hash:**
    *   **Services:** Digital Wallet/Key Management, Smart Contracts.
6.  **Record All Signatures and Document Hash On-Chain:**
    *   **Services:** Blockchain, Smart Contracts.
7.  **Maintain Immutable On-Chain Audit Trail:**
    *   **Services:** Blockchain.
8.  **Serve Verification Tools:**
    *   **Services:** Web Application.

---

## 4. Hybrid Model

### 4.1. Single Signature

**Description:** Combines off-chain storage and on-chain verification for a single-signature document.

**Steps:**
1.  **Register and Verify User Identity:**
    *   **Services:** Identity Provider/Management.
2.  **Upload or Prepare Document:**
    *   **Services:** Web Application, Secure Off-Chain Storage.
3.  **Generate Document Hash:**
    *   **Services:** Application Logic.
4.  **Sign Document Hash Using Private Key:**
    *   **Services:** Digital Wallet/Key Management.
5.  **Store Document and Signature Off-Chain:**
    *   **Services:** Secure Off-Chain Storage.
6.  **Anchor Hash (and Metadata) On-Chain:**
    *   **Services:** Blockchain.
7.  **Sync Workflow Between Systems:**
    *   **Services:** API Bridges/Oracles, Smart Contracts.
8.  **Serve Verification Tools:**
    *   **Services:** Web Application.

### 4.2. Multi-Signature

**Description:** Combines off-chain signature management with an on-chain, timestamped proof for multiple signers.

**Steps:**
1.  **Register and Prepare Document:**
    *   **Services:** Identity Provider/Management, Web Application.
2.  **Generate Document Hash:**
    *   **Services:** Application Logic.
3.  **Request Signatures:**
    *   **Services:** Notification Service.
4.  **Sign Document Hash Off-Chain:**
    *   **Services:** Digital Wallet/Key Management.
5.  **Store Document and Signatures Off-Chain:**
    *   **Services:** Secure Off-Chain Storage.
6.  **Anchor Hash (and Metadata) On-Chain:**
    *   **Services:** Blockchain.
7.  **Sync Workflow Between Systems:**
    *   **Services:** API Bridges/Oracles, Smart Contracts.
8.  **Serve Verification Tools:**
    *   **Services:** Web Application.