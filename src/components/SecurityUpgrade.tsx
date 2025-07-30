'use client';

import React, { useState, useEffect } from 'react';
import { SecurityLevel, getWalletSecurityInfo, upgradeWalletSecurity, getSecurityStatistics } from '@/lib/security-manager';
import SecurityLevelSelector from './SecurityLevelSelector';

interface SecurityUpgradeProps {
  walletAddress: string;
  onUpgradeComplete?: () => void;
  onCancel?: () => void;
}

export default function SecurityUpgrade({ walletAddress, onUpgradeComplete, onCancel }: SecurityUpgradeProps) {
  const [currentSecurityInfo, setCurrentSecurityInfo] = useState<any>(null);
  const [targetSecurityLevel, setTargetSecurityLevel] = useState<SecurityLevel>('enhanced');
  const [carrierImage, setCarrierImage] = useState<File | undefined>();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'select' | 'confirm' | 'processing'>('info');

  useEffect(() => {
    loadCurrentSecurityInfo();
  }, [walletAddress]);

  const loadCurrentSecurityInfo = async () => {
    try {
      const info = await getWalletSecurityInfo(walletAddress);
      setCurrentSecurityInfo(info);
      
      // Set default target level based on current level
      if (info?.level === 'standard') {
        setTargetSecurityLevel('enhanced');
      } else if (info?.level === 'enhanced') {
        setTargetSecurityLevel('maximum');
      }
    } catch (error) {
      console.error('Failed to load security info:', error);
      setError('Failed to load current security information');
    }
  };

  const handleUpgrade = async () => {
    if (!password) {
      setError('Please enter your password to confirm the upgrade');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('processing');

    try {
      await upgradeWalletSecurity(walletAddress, password, targetSecurityLevel, carrierImage);
      
      // Reload security info
      await loadCurrentSecurityInfo();
      
      onUpgradeComplete?.();
    } catch (error) {
      console.error('Security upgrade failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to upgrade security level');
      setStep('confirm');
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'standard': return 'text-yellow-500';
      case 'enhanced': return 'text-blue-500';
      case 'maximum': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getSecurityLevelName = (level: string) => {
    switch (level) {
      case 'standard': return 'Standard Security (v1)';
      case 'enhanced': return 'Enhanced Security (v2)';
      case 'maximum': return 'Maximum Security (v3)';
      default: return 'Unknown';
    }
  };

  const renderInfoStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Security Upgrade Available</h3>
        <p className="text-gray-300">
          Enhance your wallet security with our latest Zero Trust implementation
        </p>
      </div>

      {currentSecurityInfo && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="font-semibold text-white mb-3">Current Security Level</h4>
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${getSecurityLevelColor(currentSecurityInfo.level)}`}>
                {getSecurityLevelName(currentSecurityInfo.level)}
              </div>
              <div className="text-sm text-gray-400">
                Version: {currentSecurityInfo.version}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Steganography</div>
              <div className={currentSecurityInfo.hasStego ? 'text-green-400' : 'text-gray-500'}>
                {currentSecurityInfo.hasStego ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Upgrade Benefits:</h4>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Enhanced encryption with Web Crypto API
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Stronger key derivation (310,000 iterations)
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Authenticated encryption with integrity protection
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Optional steganography for data hiding
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Defense in depth security model
          </li>
        </ul>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setStep('select')}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
        >
          Upgrade Security
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Choose Target Security Level</h3>
        <p className="text-gray-300">
          Select the security level you want to upgrade to
        </p>
      </div>

      <SecurityLevelSelector
        selectedLevel={targetSecurityLevel}
        onLevelChange={setTargetSecurityLevel}
        onCarrierImageChange={setCarrierImage}
        disabled={isLoading}
      />

      <div className="flex space-x-4">
        <button
          onClick={() => setStep('confirm')}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50"
        >
          Continue
        </button>
        <button
          onClick={() => setStep('info')}
          className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Confirm Security Upgrade</h3>
        <p className="text-gray-300">
          Enter your password to confirm the security upgrade
        </p>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Current Level</div>
            <div className={`font-medium ${getSecurityLevelColor(currentSecurityInfo?.level || 'standard')}`}>
              {getSecurityLevelName(currentSecurityInfo?.level || 'standard')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Target Level</div>
            <div className={`font-medium ${getSecurityLevelColor(targetSecurityLevel)}`}>
              {getSecurityLevelName(targetSecurityLevel)}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Password Confirmation
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Enter your current password"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={handleUpgrade}
          disabled={isLoading || !password}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50"
        >
          {isLoading ? 'Upgrading...' : 'Upgrade Security'}
        </button>
        <button
          onClick={() => setStep('select')}
          disabled={isLoading}
          className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Back
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center space-y-6">
      <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Upgrading Security...</h3>
        <p className="text-gray-300">
          Please wait while we upgrade your wallet security. This may take a few moments.
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
      {step === 'info' && renderInfoStep()}
      {step === 'select' && renderSelectStep()}
      {step === 'confirm' && renderConfirmStep()}
      {step === 'processing' && renderProcessingStep()}
    </div>
  );
}
