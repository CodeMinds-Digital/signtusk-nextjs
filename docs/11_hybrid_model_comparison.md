# Comparison of Hybrid Model Signing Methods

This document provides a comparative overview of the single-signature and multi-signature hybrid models. Use this table to select the most suitable model based on your needs for privacy, scalability, and workflow management.

| Feature | Hybrid Model Single Signature | Hybrid Model Multi-Signature |
| :--- | :--- | :--- |
| **Primary Use Case** | Documents requiring a single, verifiable signature with an immutable on-chain proof, while keeping the document private (e.g., freelance contracts, NDAs). | Complex agreements requiring approval from multiple parties, with an on-chain audit trail and off-chain privacy (e.g., supply chain agreements, M&A term sheets). |
| **Security Level** | Very High. Combines off-chain privacy with the immutability of an on-chain anchor. | Highest. Adds multi-party consensus to the hybrid model, ensuring no single party can compromise the workflow. |
| **Trust Model** | Trust in the application provider, the off-chain storage solution, and the underlying blockchain network. | Trust in the application provider, all signatories, the off-chain storage, and the blockchain network. |
| **Complexity** | Medium. Involves both off-chain and on-chain operations for a single user. | High. Combines a multi-signer off-chain workflow with a final on-chain anchoring transaction. |
| **Cost (Gas Fees)** | Low to Medium. A single, simple on-chain transaction is needed to anchor the hash. | Medium. A single, potentially more complex on-chain transaction is needed to anchor the final proof. |
| **Workflow** | Simple: Sign Off-Chain > Anchor On-Chain. The workflow is linear and managed for a single user. | Complex: Initiate > Distribute > Sign Off-Chain > Aggregate > Anchor On-Chain. Requires robust off-chain coordination. |
| **Verification** | Two-step process: verify the off-chain signature, then confirm the document hash is anchored on-chain. | Multi-step process: verify all off-chain signatures, then confirm the collective proof is anchored on-chain. |
| **Example** | A designer signing a contract with a client, where the contract details remain private but the event is publicly verifiable. | A consortium of companies signing a joint venture agreement, where the terms are confidential but the agreement's existence and participants are provable. |