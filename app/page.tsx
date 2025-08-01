'use client';

import { useState, useEffect } from 'react';
import LinkRotatorForm from '@/components/LinkRotatorForm';
import ResultsDisplay from '@/components/ResultsDisplay';
import RecentLinksDisplay from '@/components/RecentLinksDisplay';
import { ShortenedLink } from '@/lib/types';

export default function Home() {
  const [results, setResults] = useState<ShortenedLink[]>([]);
  const [distributionInfo, setDistributionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rotator' | 'recent'>('rotator');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiKeyMessage, setApiKeyMessage] = useState('');

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, []);

  // Add a refresh button for debugging
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGenerateLinks = async (formData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      // Handle multiple links by creating separate requests for each link
      const allResults: any[] = [];
      let lastDistributionInfo: any = null;
      
      for (const originalLink of formData.originalLinks) {
        const singleLinkData = {
          ...formData,
          originalLink,
          batchSize: 1 // Each link gets 1 rotated link
        };
        
        const response = await fetch('/api/rotate-links', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(singleLinkData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate links');
        }

        allResults.push(...data.links);
        // Store distribution info from the last request (they should all be similar)
        if (data.distributionInfo) {
          lastDistributionInfo = data.distributionInfo;
        }
      }

      setResults(allResults);
      if (lastDistributionInfo) {
        setDistributionInfo(lastDistributionInfo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleUpdateApiKey = async () => {
    if (!apiKey.trim()) {
      setApiKeyMessage('Please enter an API key');
      setApiKeyStatus('error');
      return;
    }

    setApiKeyStatus('loading');
    setApiKeyMessage('');

    try {
      const response = await fetch('/api/auth/update-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setApiKeyStatus('success');
        setApiKeyMessage(data.message);
        setApiKey(''); // Clear the input after successful update
      } else {
        setApiKeyStatus('error');
        setApiKeyMessage(data.error || 'Failed to update API key');
      }
    } catch (error) {
      setApiKeyStatus('error');
      setApiKeyMessage('An error occurred while updating the API key');
    }
  };

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Travelpayouts Link Rotator
          </h1>
          <p className="text-lg text-gray-600">
            Rotate and shorten Aviasales.ru affiliate links using the Yourls API
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* API Key Management */}
          <div className="flex items-center space-x-2">
            <input
              type="password"
              placeholder="Yourls API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleUpdateApiKey}
              disabled={apiKeyStatus === 'loading'}
              className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                apiKeyStatus === 'loading'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {apiKeyStatus === 'loading' ? 'Testing...' : '✓'}
            </button>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            🔄
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Logout
          </button>
        </div>
      </div>

      {/* API Key Status Message */}
      {apiKeyMessage && (
        <div className={`mb-4 p-3 rounded-md ${
          apiKeyStatus === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {apiKeyMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('rotator')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'rotator'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Link Rotator
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'recent'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Recent Links
          </button>
        </div>
      </div>

      {activeTab === 'rotator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <LinkRotatorForm 
              onSubmit={handleGenerateLinks} 
              loading={loading} 
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <ResultsDisplay 
              results={results} 
              distributionInfo={distributionInfo}
              loading={loading} 
              error={error} 
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <RecentLinksDisplay />
        </div>
      )}
    </div>
  );
} 