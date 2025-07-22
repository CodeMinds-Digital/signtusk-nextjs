# Comparison of On-Chain Signing Methods

This document provides a comparative overview of on-chain single-signature and multi-signature signing methods. Use this table to determine the best approach based on your security, cost, and workflow requirements.

| Feature | On-Chain Single Signature | On-Chain Multi-Signature |
| :--- | :--- | :--- |
| **Primary Use Case** | High-value documents requiring a single, verifiable signature with a full on-chain audit trail (e.g., executive orders, legal attestations). | Critical agreements requiring consensus from multiple parties with the highest level of on-chain security (e.g., treasury management, board resolutions). |
| **Security Level** | Very High. The signature and document hash are immutably stored and verifiable on the blockchain. | Highest. Requires cryptographic approval from multiple, independent parties, eliminating a single point of failure. |
| **Trust Model** | Trust is placed in the underlying blockchain network and the integrity of the signer's private key. | Trust is distributed across all required signatories and the underlying blockchain network. |
| **Complexity** | Medium. Requires managing a single on-chain transaction and wallet interaction. | High. Involves a multi-step on-chain workflow, coordinating actions from all signatories. |
| **Cost (Gas Fees)** | Medium. A single transaction is required to record the signature on-chain. | High. Multiple signatures may require multiple transactions or a more complex, gas-intensive final transaction. |
| **Workflow** | Simple: Sign > Record. A single user signs, and the result is immediately recorded on-chain. | Complex: Initiate > Sign > Aggregate > Execute. Requires a sequential or parallel workflow to gather all signatures before final on-chain execution. |
| **Verification** | Straightforward. Verify a single signature against the on-chain data using the signer's public key. | Complex. Verify each signature from the on-chain transaction against each signer's public key. |
| **Example** | A CEO signing a legally binding digital certificate. | A decentralized autonomous organization (DAO) approving a funding proposal. |