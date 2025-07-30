'use client';

import { useState, useEffect } from 'react';

interface StegoWallet {
  address: string;
  customId: string;
  version: string;
  createdAt: number;
}

export default function TestStegoPage() {
  const [wallets, setWallets] = useState<StegoWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [stegoImage, setStegoImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCombinedWallets();
  }, []);

  const loadCombinedWallets = () => {
    try {
      const stored = localStorage.getItem('combined_secure_wallets');
      if (stored) {
        const walletsObj = JSON.parse(stored);
        const walletsList = Object.values(walletsObj) as StegoWallet[];
        setWallets(walletsList);
        console.log('Found combined wallets:', walletsList);
      } else {
        console.log('No combined wallets found');
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
      setError('Failed to load wallets');
    }
  };

  const loadStegoImage = async (address: string) => {
    setLoading(true);
    setError('');
    setStegoImage('');

    try {
      console.log('Loading stego image for address:', address);

      // First, let's check what databases exist
      const databases = await indexedDB.databases();
      console.log('Available IndexedDB databases:', databases);

      // Open IndexedDB with error handling for missing object stores
      const dbRequest = indexedDB.open('CombinedSecureWallets', 1);

      dbRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('Creating IndexedDB object stores...');

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains('stegoImages')) {
          db.createObjectStore('stegoImages', { keyPath: 'address' });
        }
      };

      dbRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB opened, object stores:', Array.from(db.objectStoreNames));

        // Check if the object store exists
        if (!db.objectStoreNames.contains('stegoImages')) {
          setError('No steganography images stored yet. Create a Maximum Security wallet first.');
          setLoading(false);
          return;
        }

        const transaction = db.transaction(['stegoImages'], 'readonly');
        const store = transaction.objectStore('stegoImages');
        const getRequest = store.get(address.toLowerCase());

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            const blob = getRequest.result.image;
            const url = URL.createObjectURL(blob);
            setStegoImage(url);
            console.log('Stego image loaded successfully');
          } else {
            setError('No steganography image found for this wallet address');
          }
          setLoading(false);
        };

        getRequest.onerror = () => {
          setError('Failed to load steganography image from IndexedDB');
          setLoading(false);
        };
      };

      dbRequest.onerror = () => {
        setError('Failed to open IndexedDB');
        setLoading(false);
      };

    } catch (error) {
      console.error('Error loading stego image:', error);
      setError(`Failed to load steganography image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (stegoImage) {
      const link = document.createElement('a');
      link.href = stegoImage;
      link.download = `stego-wallet-${selectedWallet}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const generateTestAvatar = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/test/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: `test-${Date.now()}`,
          size: 512
        })
      });

      const data = await response.json();
      if (data.success) {
        setStegoImage(data.image);
        console.log('Test avatar generated');
      } else {
        setError('Failed to generate test avatar');
      }
    } catch (error) {
      console.error('Error generating test avatar:', error);
      setError('Failed to generate test avatar');
    } finally {
      setLoading(false);
    }
  };

  const debugStorage = () => {
    console.log('=== STORAGE DEBUG ===');

    // Check localStorage
    console.log('LocalStorage keys:', Object.keys(localStorage));
    console.log('Combined wallets:', localStorage.getItem('combined_secure_wallets'));
    console.log('Combined keys:', localStorage.getItem('combined_stego_keys'));
    console.log('Current wallet:', localStorage.getItem('current_combined_wallet'));

    // Check regular wallets
    console.log('Regular wallets:', localStorage.getItem('wallets'));

    // Check IndexedDB
    indexedDB.databases().then(databases => {
      console.log('IndexedDB databases:', databases);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          🎨 Steganography Image Viewer
        </h1>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Maximum Security Wallets</h2>

          {wallets.length === 0 ? (
            <div className="text-gray-300 text-center py-8">
              <p>No maximum security wallets found.</p>
              <p className="text-sm mt-2">Create a wallet with "Maximum Security" to see steganography images.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {wallets.map((wallet) => (
                <div key={wallet.address} className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">Custom ID: {wallet.customId}</p>
                      <p className="text-gray-300 text-sm">Address: {wallet.address}</p>
                      <p className="text-gray-400 text-xs">
                        Created: {new Date(wallet.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedWallet(wallet.address);
                        loadStegoImage(wallet.address);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                    >
                      View Image
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Test & Debug</h2>
          <div className="space-x-4">
            <button
              onClick={generateTestAvatar}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Test Avatar'}
            </button>

            <button
              onClick={debugStorage}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              🔍 Debug Storage
            </button>

            <button
              onClick={loadCombinedWallets}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
            >
              🔄 Refresh Wallets
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-white">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2">Loading...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-8">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {stegoImage && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Steganography Image</h2>
              <button
                onClick={downloadImage}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                Download PNG
              </button>
            </div>

            <div className="text-center">
              <img
                src={stegoImage}
                alt="Steganography Image"
                className="max-w-full h-auto rounded-lg border border-white/20 mx-auto"
                style={{ maxHeight: '512px' }}
              />
              <p className="text-gray-300 text-sm mt-4">
                This image contains hidden encrypted wallet data using steganography.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
