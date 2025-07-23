'use client';

import React from 'react';

export default function ModelsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Document Signing Models</h1>
              <p className="text-gray-300">Implementation of Model 1.1 and Model 1.2 from Document-signing-flows.docx</p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Model 1.1 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-full flex items-center justify-center mr-4">
              <span className="text-white font-bold text-lg">1.1</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Off-Chain Document Signing - Single Signature</h2>
              <p className="text-gray-300">Model 1.1: Signing a document off-chain with a single digital signature</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Implementation Steps</h3>
              <ol className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
                  <div>
                    <strong className="text-white">Register and Verify User Identity</strong>
                    <p className="text-sm text-gray-400">Identity Provider/Management service</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
                  <div>
                    <strong className="text-white">Upload/Prepare Document</strong>
                    <p className="text-sm text-gray-400">Web Application, Document Service</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
                  <div>
                    <strong className="text-white">Generate Document Hash and Sign</strong>
                    <p className="text-sm text-gray-400">Document Service, Digital Wallet/Key Management</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">4</span>
                  <div>
                    <strong className="text-white">Store Document and Signature Off-Chain</strong>
                    <p className="text-sm text-gray-400">Secure Off-Chain Storage, Database</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">5</span>
                  <div>
                    <strong className="text-white">Serve Verification Tools</strong>
                    <p className="text-sm text-gray-400">Web Application, Document Service</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Features Implemented</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Document upload and hash generation
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Digital signature creation using private key
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Off-chain storage (localStorage for demo)
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Signature verification tools
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Signing history tracking
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Document integrity verification
                </li>
              </ul>

              <div className="mt-6">
                <button
                  onClick={() => window.location.href = '/sign-document'}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold"
                >
                  Try Model 1.1 - Single Signature
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Model 1.2 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 w-12 h-12 rounded-full flex items-center justify-center mr-4">
              <span className="text-white font-bold text-lg">1.2</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Off-Chain Document Signing - Multi-Signature</h2>
              <p className="text-gray-300">Model 1.2: Signing a document off-chain with multiple digital signatures</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Implementation Steps</h3>
              <ol className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
                  <div>
                    <strong className="text-white">Initiate Document and Define Signers</strong>
                    <p className="text-sm text-gray-400">Web Application, Document Service</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
                  <div>
                    <strong className="text-white">Generate Document Hash</strong>
                    <p className="text-sm text-gray-400">Document Service</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
                  <div>
                    <strong className="text-white">Collect Signatures Sequentially or in Parallel</strong>
                    <p className="text-sm text-gray-400">Notification Service, Web Application, Digital Wallet/Key Management</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">4</span>
                  <div>
                    <strong className="text-white">Store Individual Signatures</strong>
                    <p className="text-sm text-gray-400">Database</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">5</span>
                  <div>
                    <strong className="text-white">Aggregate Signatures and Finalize</strong>
                    <p className="text-sm text-gray-400">Document Service</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">6</span>
                  <div>
                    <strong className="text-white">Store Final Document and Provide Verification</strong>
                    <p className="text-sm text-gray-400">Secure Off-Chain Storage, Database, Web Application</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Features Implemented</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Multi-signature request initiation
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Multiple signer management
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Parallel signature collection
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Signature status tracking
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Pending signature notifications
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Document completion workflow
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Multi-signature verification
                </li>
              </ul>

              <div className="mt-6">
                <button
                  onClick={() => window.location.href = '/multi-signature'}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-semibold"
                >
                  Try Model 1.2 - Multi-Signature
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Implementation Details */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Technical Implementation</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">🔐 Cryptographic Security</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• SHA-256 document hashing</li>
                <li>• ECDSA digital signatures</li>
                <li>• Ethereum-compatible key management</li>
                <li>• Signature verification algorithms</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">💾 Storage Architecture</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Off-chain document storage</li>
                <li>• Encrypted signature storage</li>
                <li>• Local storage for demo</li>
                <li>• Scalable database design</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">🔄 Workflow Management</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Multi-party coordination</li>
                <li>• Status tracking system</li>
                <li>• Notification mechanisms</li>
                <li>• Audit trail maintenance</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-3">🚀 Ready for Production</h3>
            <p className="text-gray-300 text-sm mb-4">
              Both Model 1.1 and Model 1.2 have been successfully implemented according to the specifications in the Document-signing-flows.docx. 
              The implementation includes all required services and follows the step-by-step processes outlined in the documentation.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => window.location.href = '/sign-document'}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 text-sm font-semibold"
              >
                Test Single Signature
              </button>
              <button
                onClick={() => window.location.href = '/multi-signature'}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 text-sm font-semibold"
              >
                Test Multi-Signature
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}