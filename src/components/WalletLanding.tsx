'use client';

import React, { useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useRouter } from 'next/navigation';

export default function WalletLanding() {
  const { hasWallet, isAuthenticated } = useWallet();
  const router = useRouter();

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Don't render anything if redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Redirecting to dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">📝</span>
              </div>
              <h1 className="text-2xl font-bold text-white">SignTusk</h1>
            </div>
            <nav className="flex space-x-4">
              <button
                onClick={() => router.push('/login')}
                className="bg-white/10 backdrop-blur-sm text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 font-medium"
              >
                Login
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium"
              >
                Get Started
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Hero Content */}
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Blockchain-Powered • Legally Binding • Tamper-Proof
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Secure Document
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Signing Platform
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Sign documents with cryptographic security using blockchain technology. 
            Create your digital identity, sign contracts, and verify authenticity with military-grade encryption.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <button
              onClick={() => router.push('/signup')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
            >
              Create New Identity
            </button>
            {hasWallet && (
              <button
                onClick={() => router.push('/login')}
                className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition-all duration-200 border border-white/20"
              >
                Login to Local Identity
              </button>
            )}
            <button
              onClick={() => router.push('/import')}
              className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              Import Existing Identity
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Cryptographic Security</h3>
              <p className="text-gray-300 leading-relaxed">
                Your digital signatures are protected with AES-256 encryption and stored locally. 
                Only you control your signing identity.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">⛓️</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Blockchain Verified</h3>
              <p className="text-gray-300 leading-relaxed">
                All signatures are recorded on the Ethereum blockchain, 
                providing immutable proof of authenticity and timestamp.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">⚖️</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Legally Binding</h3>
              <p className="text-gray-300 leading-relaxed">
                Digital signatures created with SignTusk are legally recognized 
                and compliant with international e-signature standards.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🆔</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Unique Signer ID</h3>
              <p className="text-gray-300 leading-relaxed">
                Each identity gets a unique 15-character ID for easy identification 
                and verification across the platform.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Tamper-Proof</h3>
              <p className="text-gray-300 leading-relaxed">
                Once signed, documents cannot be altered without detection. 
                Any changes invalidate the signature immediately.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Global Access</h3>
              <p className="text-gray-300 leading-relaxed">
                Access your signing identity from anywhere in the world. 
                Works on desktop, mobile, and tablet devices.
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-8 mt-20 backdrop-blur-sm">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mr-4">
                <span className="text-yellow-400 text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold text-yellow-400">Important Security Notice</h3>
            </div>
            <div className="text-yellow-200 space-y-3 text-left max-w-3xl mx-auto">
              <p>• Always backup your recovery phrase in a secure location</p>
              <p>• Never share your recovery phrase or private key with anyone</p>
              <p>• Your signing identity is stored locally - clearing browser data will require recovery</p>
              <p>• We cannot recover your identity if you lose your recovery phrase</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-400">
            <p className="text-lg">© 2024 SignTusk. Built with Next.js, Ethers.js, and Blockchain Technology.</p>
            <p className="mt-2">
              Secure, decentralized, and legally binding document signing platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}