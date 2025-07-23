# Common Services for Document Signing Models

This document outlines the common services typically required for the various document signing models. The specific services needed will depend on the chosen model.

*   **Identity Provider/Management:** An authentication service (e.g., SSO, OAuth, DIDs, Okta, Azure AD) to verify user identities and manage roles. This is crucial for ensuring that only authorized individuals can sign documents.

*   **Secure Off-Chain Storage:** A reliable storage solution (e.g., IPFS, AWS S3, Google Cloud Storage, or a private server) to hold original documents, signatures, and related metadata. This service ensures the confidentiality and availability of the documents.

*   **Database:** A database system (e.g., PostgreSQL, MySQL) to store metadata, document references, signatures, and manage workflow states. It acts as the backbone for tracking the signing process.

*   **Digital Wallet/Key Management/Secure Key Store:** A system for users to securely manage their private keys and create digital signatures (e.g., MetaMask, Trust Wallet, Fortanix). This is fundamental for the cryptographic signing process.

*   **Blockchain:** A public or private blockchain (e.g., Ethereum, Polygon, Hyperledger Fabric) to anchor document hashes, record immutable proofs, and execute smart contracts. This provides the trust and immutability for on-chain and hybrid models.

*   **Smart Contracts:** A set of smart contracts to manage the signing logic, store data, enforce rules, and handle multi-signature workflows on the blockchain.

*   **Notification Service:** A service (e.g., email, SMS, SendGrid, AWS SNS) to alert signatories when their action is required. This is important for user experience in multi-signature workflows.

*   **API Bridges/Oracles:** Middleware services that facilitate communication and sync state between the blockchain and off-chain systems. This is key for hybrid models that need to coordinate on-chain and off-chain activities.