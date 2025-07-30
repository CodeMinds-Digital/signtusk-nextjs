'use client';

import React, { useState, useEffect } from 'react';
import { getSecurityStatistics, getWalletSecurityInfo, SecurityLevel } from '@/lib/security-manager';
import { getSecurityInfo, estimateSecurityStrength } from '@/lib/combined-security';
import SecurityUpgrade from './SecurityUpgrade';

interface SecurityDashboardProps {
  walletAddress?: string;
}

export default function SecurityDashboard({ walletAddress }: SecurityDashboardProps) {
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [walletSecurityInfo, setWalletSecurityInfo] = useState<any>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, [walletAddress]);

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      // Load general security statistics
      const stats = getSecurityStatistics();
      setSecurityStats(stats);

      // Load wallet-specific security info if address provided
      if (walletAddress) {
        const walletInfo = await getWalletSecurityInfo(walletAddress);
        setWalletSecurityInfo(walletInfo);
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityLevelColor = (level: SecurityLevel) => {
    switch (level) {
      case 'standard': return 'text-yellow-500 bg-yellow-500/20';
      case 'enhanced': return 'text-blue-500 bg-blue-500/20';
      case 'maximum': return 'text-green-500 bg-green-500/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getSecurityLevelName = (level: SecurityLevel) => {
    switch (level) {
      case 'standard': return 'Standard (v1)';
      case 'enhanced': return 'Enhanced (v2)';
      case 'maximum': return 'Maximum (v3)';
      default: return 'Unknown';
    }
  };

  const renderWalletSecurity = () => {
    if (!walletAddress || !walletSecurityInfo) return null;

    const securityInfo = getSecurityInfo();
    const strengthInfo = estimateSecurityStrength();

    return (
      <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Wallet Security</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">Current Security Level</div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSecurityLevelColor(walletSecurityInfo.level)}`}>
                {getSecurityLevelName(walletSecurityInfo.level)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Version:</span>
                <span className="text-white">{walletSecurityInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Steganography:</span>
                <span className={walletSecurityInfo.hasStego ? 'text-green-400' : 'text-gray-500'}>
                  {walletSecurityInfo.hasStego ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {walletSecurityInfo.createdAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white">
                    {new Date(walletSecurityInfo.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">Security Strength</div>
              <div className="text-green-400 font-medium">{strengthInfo.overallRating}</div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Encryption:</span>
                <span className="text-white">{strengthInfo.encryptionStrength}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Data Hiding:</span>
                <span className="text-white">{strengthInfo.steganographyStrength}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Time to Break:</span>
                <span className="text-white">{strengthInfo.timeToBreak}</span>
              </div>
            </div>
          </div>
        </div>

        {walletSecurityInfo.level !== 'maximum' && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Upgrade Available</div>
                <div className="text-sm text-gray-400">
                  Enhance your security with our latest Zero Trust implementation
                </div>
              </div>
              <button
                onClick={() => setShowUpgrade(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
              >
                Upgrade Security
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSecurityFeatures = () => {
    if (!securityStats) return null;

    return (
      <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Available Security Features</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className={`flex items-center ${securityStats.features.webCrypto ? 'text-green-400' : 'text-red-400'}`}>
            <span className="mr-2">{securityStats.features.webCrypto ? '✓' : '✗'}</span>
            Web Crypto API
          </div>
          <div className={`flex items-center ${securityStats.features.indexedDB ? 'text-green-400' : 'text-red-400'}`}>
            <span className="mr-2">{securityStats.features.indexedDB ? '✓' : '✗'}</span>
            IndexedDB Storage
          </div>
          <div className={`flex items-center ${securityStats.features.canvas ? 'text-green-400' : 'text-red-400'}`}>
            <span className="mr-2">{securityStats.features.canvas ? '✓' : '✗'}</span>
            Canvas API
          </div>
          <div className={`flex items-center ${securityStats.features.localStorage ? 'text-green-400' : 'text-red-400'}`}>
            <span className="mr-2">{securityStats.features.localStorage ? '✓' : '✗'}</span>
            Local Storage
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
          <div className="text-blue-200 text-sm">
            <strong>Recommended Security Level:</strong> {getSecurityLevelName(securityStats.recommended)}
          </div>
        </div>
      </div>
    );
  };

  const renderSecurityLevels = () => {
    const levels = [
      {
        level: 'standard' as SecurityLevel,
        name: 'Standard Security (v1)',
        description: 'Basic password-based encryption',
        features: ['AES-256 encryption', 'PBKDF2 key derivation', 'Local storage'],
        count: securityStats?.securityLevels.standard || 0
      },
      {
        level: 'enhanced' as SecurityLevel,
        name: 'Enhanced Security (v2)',
        description: 'Advanced encryption with Web Crypto API',
        features: ['AES-GCM encryption', '310k PBKDF2 iterations', 'Hardware acceleration'],
        count: securityStats?.securityLevels.enhanced || 0
      },
      {
        level: 'maximum' as SecurityLevel,
        name: 'Maximum Security (v3)',
        description: 'Combined encryption and steganography',
        features: ['Enhanced encryption', 'LSB steganography', 'Multi-layer protection'],
        count: securityStats?.securityLevels.maximum || 0
      }
    ];

    return (
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Security Levels Overview</h3>
        
        <div className="space-y-4">
          {levels.map((levelInfo) => (
            <div key={levelInfo.level} className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`font-medium ${getSecurityLevelColor(levelInfo.level).split(' ')[0]}`}>
                  {levelInfo.name}
                </div>
                <div className="text-sm text-gray-400">
                  {levelInfo.count} wallet{levelInfo.count !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="text-sm text-gray-300 mb-2">
                {levelInfo.description}
              </div>
              
              <div className="flex flex-wrap gap-1">
                {levelInfo.features.map((feature, index) => (
                  <span
                    key={index}
                    className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (showUpgrade && walletAddress) {
    return (
      <SecurityUpgrade
        walletAddress={walletAddress}
        onUpgradeComplete={() => {
          setShowUpgrade(false);
          loadSecurityData();
        }}
        onCancel={() => setShowUpgrade(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Security Dashboard</h2>
        <p className="text-gray-300">
          Monitor and manage your wallet security with Zero Trust implementation
        </p>
      </div>

      {renderWalletSecurity()}
      {renderSecurityFeatures()}
      {renderSecurityLevels()}
    </div>
  );
}
