'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useRouter } from 'next/navigation';

export default function WalletLanding() {
  const { hasWallet, isAuthenticated, isLoading, currentUser } = useWallet();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  // Animation trigger
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // FIXED: Simple, clear authentication logic - no flickering
  const showDashboardButton = isAuthenticated && currentUser;
  const showAuthButtons = !isAuthenticated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className={`flex items-center transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">SignTusk</h1>
            </div>
            <nav className={`flex space-x-4 transition-all duration-1000 delay-200 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
              {isLoading ? (
                <div className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl border border-white/20">
                  Loading...
                </div>
              ) : showDashboardButton ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-medium shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/login')}
                    className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20 font-medium hover:scale-105"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => router.push('/signup')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-medium shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                  >
                    Get Started
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Hero Content */}
          <div className={`mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></span>
              Blockchain-Powered • Legally Binding • Tamper-Proof
            </div>
          </div>

          <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 leading-tight">
              The Future of
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                Digital Signing
              </span>
            </h1>
          </div>
          
          <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <p className="text-xl text-gray-300 mb-16 max-w-4xl mx-auto leading-relaxed">
              Revolutionary blockchain-powered document signing platform. Create your cryptographic identity, 
              sign contracts with military-grade security, and verify authenticity with immutable blockchain records.
            </p>
          </div>

          {/* Action Buttons - FIXED: Clear, consistent flow */}
          <div className={`flex flex-col sm:flex-row gap-6 justify-center mb-24 transition-all duration-1000 delay-900 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {isLoading ? (
              <div className="bg-white/10 backdrop-blur-sm text-white px-10 py-5 rounded-2xl text-lg font-semibold border border-white/20">
                Loading...
              </div>
            ) : showDashboardButton ? (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="group bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-5 rounded-2xl text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-2xl hover:shadow-purple-500/30 hover:scale-105 relative overflow-hidden"
                >
                  <span className="relative z-10">Go to Dashboard</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                <button
                  onClick={() => router.push('/sign-document')}
                  className="bg-white/10 backdrop-blur-sm text-white px-10 py-5 rounded-2xl text-lg font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 hover:scale-105"
                >
                  Quick Sign Document
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/signup')}
                  className="group bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-5 rounded-2xl text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-2xl hover:shadow-purple-500/30 hover:scale-105 relative overflow-hidden"
                >
                  <span className="relative z-10">Create New Identity</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                {hasWallet && (
                  <button
                    onClick={() => router.push('/login')}
                    className="bg-white/10 backdrop-blur-sm text-white px-10 py-5 rounded-2xl text-lg font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 hover:scale-105"
                  >
                    Access Local Identity
                  </button>
                )}
                <button
                  onClick={() => router.push('/import')}
                  className="bg-white/10 backdrop-blur-sm text-white px-10 py-5 rounded-2xl text-lg font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 hover:scale-105"
                >
                  Import Identity
                </button>
              </>
            )}
          </div>

          {/* Quick Actions for Authenticated Users */}
          {showDashboardButton && (
            <div className={`bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mb-24 transition-all duration-1000 delay-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push('/sign-document')}
                  className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm text-green-300 p-6 rounded-xl hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-200 border border-green-500/30"
                >
                  <div className="text-3xl mb-3">📝</div>
                  <div className="font-semibold text-lg">Single Signature</div>
                  <p className="text-sm opacity-75 mt-2">Sign documents individually</p>
                </button>
                <button
                  onClick={() => router.push('/multi-signature')}
                  className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm text-blue-300 p-6 rounded-xl hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200 border border-blue-500/30"
                >
                  <div className="text-3xl mb-3">👥</div>
                  <div className="font-semibold text-lg">Multi-Signature</div>
                  <p className="text-sm opacity-75 mt-2">Require multiple signers</p>
                </button>
                <button
                  onClick={() => router.push('/verify')}
                  className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm text-purple-300 p-6 rounded-xl hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200 border border-purple-500/30"
                >
                  <div className="text-3xl mb-3">🔍</div>
                  <div className="font-semibold text-lg">Verify Documents</div>
                  <p className="text-sm opacity-75 mt-2">Check signature validity</p>
                </button>
              </div>
            </div>
          )}

          {/* Stats Section */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 transition-all duration-1000 delay-1100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">256-bit</div>
              <div className="text-gray-400">AES Encryption</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">100%</div>
              <div className="text-gray-400">Tamper-Proof</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">Global</div>
              <div className="text-gray-400">Blockchain Network</div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-24">
            {[
              {
                icon: "🔐",
                title: "Military-Grade Security",
                description: "AES-256 encryption with local key storage. Your private keys never leave your device.",
                gradient: "from-purple-500 to-pink-500",
                delay: "delay-[1300ms]"
              },
              {
                icon: "⛓️",
                title: "Blockchain Verified",
                description: "Immutable proof of authenticity recorded on Ethereum blockchain with timestamp verification.",
                gradient: "from-blue-500 to-cyan-500",
                delay: "delay-[1400ms]"
              },
              {
                icon: "⚖️",
                title: "Legally Compliant",
                description: "Meets international e-signature standards and regulations for legal document signing.",
                gradient: "from-green-500 to-emerald-500",
                delay: "delay-[1500ms]"
              },
              {
                icon: "🆔",
                title: "Unique Identity",
                description: "15-character unique signer ID for easy identification and cross-platform verification.",
                gradient: "from-yellow-500 to-orange-500",
                delay: "delay-[1600ms]"
              },
              {
                icon: "��️",
                title: "Tamper Detection",
                description: "Any document modification after signing is immediately detected and signature invalidated.",
                gradient: "from-red-500 to-pink-500",
                delay: "delay-[1700ms]"
              },
              {
                icon: "🌐",
                title: "Universal Access",
                description: "Cross-platform compatibility with desktop, mobile, and tablet devices worldwide.",
                gradient: "from-indigo-500 to-purple-500",
                delay: "delay-[1800ms]"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className={`group bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:border-white/20 ${feature.delay} ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
              >
                <div className={`w-20 h-20 bg-gradient-to-r ${feature.gradient} rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <span className="text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white group-hover:text-purple-300 transition-colors duration-300">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* How It Works Section */}
          <div className={`mt-32 transition-all duration-1000 delay-[1900ms] ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h2 className="text-4xl font-bold text-white mb-16">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  step: "01",
                  title: "Create Identity",
                  description: "Generate your cryptographic signing identity with a unique 15-character ID"
                },
                {
                  step: "02", 
                  title: "Sign Documents",
                  description: "Upload and sign documents with your encrypted private key stored locally"
                },
                {
                  step: "03",
                  title: "Blockchain Verify",
                  description: "Signature hash is recorded on Ethereum for immutable proof of authenticity"
                }
              ].map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{step.title}</h3>
                  <p className="text-gray-300">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <div className={`bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-3xl p-10 mt-32 backdrop-blur-sm transition-all duration-1000 delay-[2000ms] ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mr-6">
                <span className="text-yellow-400 text-3xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-semibold text-yellow-400">Security Best Practices</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-yellow-200 max-w-4xl mx-auto">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Backup your recovery phrase in multiple secure locations</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Never share your recovery phrase or private key</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Identity is stored locally - backup before clearing browser data</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 mt-1">•</span>
                <span>We cannot recover lost identities - you are in full control</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 bg-black/30 backdrop-blur-md border-t border-white/10 mt-20 transition-all duration-1000 delay-[2100ms] ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">SignTusk</span>
            </div>
            <p className="text-lg text-gray-300 mb-4">
              © 2024 SignTusk. Powered by Next.js, Ethers.js, and Ethereum Blockchain.
            </p>
            <p className="text-gray-400">
              Secure, decentralized, and legally binding document signing for the digital age.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}