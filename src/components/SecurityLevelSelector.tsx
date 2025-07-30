'use client';

import React, { useState, useEffect } from 'react';
import { SecurityLevel, getAvailableSecurityFeatures, getRecommendedSecurityLevel } from '@/lib/security-manager';

interface SecurityLevelSelectorProps {
  selectedLevel: SecurityLevel;
  onLevelChange: (level: SecurityLevel) => void;
  onCarrierImageChange?: (file: File | undefined) => void;
  disabled?: boolean;
}

interface SecurityLevelInfo {
  level: SecurityLevel;
  name: string;
  description: string;
  features: string[];
  pros: string[];
  cons: string[];
  processingTime: string;
  securityRating: number;
  available: boolean;
}

export default function SecurityLevelSelector({
  selectedLevel,
  onLevelChange,
  onCarrierImageChange,
  disabled = false
}: SecurityLevelSelectorProps) {
  const [features, setFeatures] = useState(getAvailableSecurityFeatures());
  const [recommendedLevel, setRecommendedLevel] = useState<SecurityLevel>('standard');
  const [carrierImageFile, setCarrierImageFile] = useState<File | undefined>();

  useEffect(() => {
    const availableFeatures = getAvailableSecurityFeatures();
    const recommended = getRecommendedSecurityLevel();
    
    setFeatures(availableFeatures);
    setRecommendedLevel(recommended);
  }, []);

  const securityLevels: SecurityLevelInfo[] = [
    {
      level: 'standard',
      name: 'Standard Security (v1)',
      description: 'Basic password-based encryption using industry-standard algorithms',
      features: ['AES-256 encryption', 'PBKDF2 key derivation', 'Local storage'],
      pros: ['Fast processing', 'Wide compatibility', 'Simple setup'],
      cons: ['Basic security level', 'Vulnerable to advanced attacks'],
      processingTime: '< 1 second',
      securityRating: 3,
      available: true
    },
    {
      level: 'enhanced',
      name: 'Enhanced Security (v2)',
      description: 'Advanced encryption with Web Crypto API and stronger key derivation',
      features: ['AES-GCM authenticated encryption', 'PBKDF2 with 310k iterations', 'Hardware acceleration'],
      pros: ['Strong encryption', 'Integrity protection', 'Hardware-backed security'],
      cons: ['Slower processing', 'Requires modern browser'],
      processingTime: '2-5 seconds',
      securityRating: 4,
      available: features.webCrypto
    },
    {
      level: 'maximum',
      name: 'Maximum Security (v3)',
      description: 'Combined encryption and steganography for ultimate protection',
      features: ['Enhanced encryption', 'LSB steganography', 'Multi-layer protection', 'Defense in depth'],
      pros: ['Maximum security', 'Data hiding', 'Multiple attack vectors required'],
      cons: ['Longest processing time', 'Requires all browser features'],
      processingTime: '5-15 seconds',
      securityRating: 5,
      available: features.webCrypto && features.indexedDB && features.canvas
    }
  ];

  const handleLevelChange = (level: SecurityLevel) => {
    if (!disabled) {
      onLevelChange(level);
    }
  };

  const handleCarrierImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setCarrierImageFile(file);
    onCarrierImageChange?.(file);
  };

  const getSecurityRatingColor = (rating: number) => {
    if (rating <= 2) return 'text-red-500';
    if (rating <= 3) return 'text-yellow-500';
    if (rating <= 4) return 'text-blue-500';
    return 'text-green-500';
  };

  const getSecurityRatingText = (rating: number) => {
    if (rating <= 2) return 'Low';
    if (rating <= 3) return 'Standard';
    if (rating <= 4) return 'High';
    return 'Maximum';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Choose Security Level</h3>
        <p className="text-gray-300 text-sm">
          Select the security level that best fits your needs. Higher levels provide better protection but take longer to process.
        </p>
      </div>

      <div className="space-y-4">
        {securityLevels.map((levelInfo) => (
          <div
            key={levelInfo.level}
            className={`
              relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
              ${levelInfo.available 
                ? (selectedLevel === levelInfo.level 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-gray-600 hover:border-gray-500 bg-gray-800/50')
                : 'border-gray-700 bg-gray-900/50 opacity-50 cursor-not-allowed'
              }
              ${disabled ? 'pointer-events-none opacity-50' : ''}
            `}
            onClick={() => levelInfo.available && handleLevelChange(levelInfo.level)}
          >
            {/* Recommended badge */}
            {levelInfo.level === recommendedLevel && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Recommended
              </div>
            )}

            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center
                  ${selectedLevel === levelInfo.level ? 'border-purple-500 bg-purple-500' : 'border-gray-400'}
                `}>
                  {selectedLevel === levelInfo.level && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{levelInfo.name}</h4>
                  <p className="text-sm text-gray-300">{levelInfo.description}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`font-semibold ${getSecurityRatingColor(levelInfo.securityRating)}`}>
                  {getSecurityRatingText(levelInfo.securityRating)}
                </div>
                <div className="text-xs text-gray-400">{levelInfo.processingTime}</div>
              </div>
            </div>

            {/* Features */}
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-300 mb-1">Features:</div>
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

            {/* Pros and Cons */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-green-400 font-medium mb-1">Pros:</div>
                <ul className="text-gray-300 space-y-1">
                  {levelInfo.pros.map((pro, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-400 mr-1">✓</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-yellow-400 font-medium mb-1">Considerations:</div>
                <ul className="text-gray-300 space-y-1">
                  {levelInfo.cons.map((con, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-yellow-400 mr-1">!</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Availability indicator */}
            {!levelInfo.available && (
              <div className="mt-3 text-red-400 text-sm">
                ⚠️ Not available: Missing required browser features
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Carrier Image Upload for Maximum Security */}
      {selectedLevel === 'maximum' && (
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6">
          <div className="text-center">
            <h4 className="font-semibold text-white mb-2">Carrier Image (Optional)</h4>
            <p className="text-gray-300 text-sm mb-4">
              Upload an image to hide your wallet data within. If no image is provided, a default pattern will be used.
            </p>
            
            <input
              type="file"
              accept="image/*"
              onChange={handleCarrierImageUpload}
              className="hidden"
              id="carrier-image-upload"
              disabled={disabled}
            />
            
            <label
              htmlFor="carrier-image-upload"
              className={`
                inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              Choose Image
            </label>
            
            {carrierImageFile && (
              <div className="mt-3 text-sm text-gray-300">
                Selected: {carrierImageFile.name} ({Math.round(carrierImageFile.size / 1024)} KB)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature Compatibility */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-3">Browser Compatibility</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className={`flex items-center ${features.webCrypto ? 'text-green-400' : 'text-red-400'}`}>
            <span className="mr-2">{features.webCrypto ? '✓' : '✗'}</span>
            Web Crypto API
          </div>
          <div className={`flex items-center ${features.indexedDB ? 'text-green-400' : 'text-red-400'}`}>
            <span className="mr-2">{features.indexedDB ? '✓' : '✗'}</span>
            IndexedDB
          </div>
          <div className={`flex items-center ${features.canvas ? 'text-green-400' : 'text-red-400'}`}>
            <span className="mr-2">{features.canvas ? '✓' : '✗'}</span>
            Canvas API
          </div>
          <div className={`flex items-center ${features.localStorage ? 'text-green-400' : 'text-red-400'}`}>
            <span className="mr-2">{features.localStorage ? '✓' : '✗'}</span>
            Local Storage
          </div>
        </div>
      </div>
    </div>
  );
}
