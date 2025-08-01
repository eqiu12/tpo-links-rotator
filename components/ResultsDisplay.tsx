'use client';

import { useState } from 'react';
import { ShortenedLink } from '@/lib/types';

interface ResultsDisplayProps {
  results: ShortenedLink[];
  distributionInfo?: any;
  loading: boolean;
  error: string | null;
}

export default function ResultsDisplay({ results, distributionInfo, loading, error }: ResultsDisplayProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = ['Short URL', 'Original URL', 'Marker', 'Subid', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...results.map(link => [
        link.shortUrl,
        link.originalUrl,
        link.marker,
        link.subid || '',
        link.createdAt
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotated-links-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportShortUrlsOnly = () => {
    if (results.length === 0) return;

    const urls = results.map(link => link.shortUrl).join('\n');
    const blob = new Blob([urls], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `short-urls-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Results</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Generating links...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Results</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Results</h2>
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="mt-2">No links generated yet. Fill out the form and click "Generate Rotated Links" to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Generated Links</h2>
        <div className="flex space-x-2">
          <button
            onClick={exportShortUrlsOnly}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Export URLs
          </button>
          <button
            onClick={exportToCSV}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Success!</h3>
            <div className="mt-2 text-sm text-green-700">
              Generated {results.length} shortlinks with smart marker distribution based on click performance.
            </div>
          </div>
        </div>
      </div>

      {/* Smart Distribution Info */}
      {distributionInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <h3 className="text-sm font-medium text-blue-800 mb-3">Smart Distribution Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Current Click Performance (Last 500 Links)</h4>
              <div className="space-y-1">
                {Object.entries(distributionInfo.clickPercentages).map(([marker, percentage]) => (
                  <div key={marker} className="flex justify-between">
                    <span className="text-blue-600">Marker {marker}:</span>
                    <span className="font-medium">{Number(percentage).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Distribution Strategy</h4>
              <div className="space-y-1">
                {Object.entries(distributionInfo.underperformance).map(([marker, underperf]) => (
                  <div key={marker} className="flex justify-between">
                    <span className="text-blue-600">Marker {marker}:</span>
                    <span className={`font-medium ${Number(underperf) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {Number(underperf) > 0 ? `+${Number(underperf).toFixed(1)}% needed` : 'On target'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {results.map((link, index) => (
          <div key={index} className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{link.shortUrl}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {link.marker}
                  </span>
                  {link.subid && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {link.subid}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">{link.originalUrl}</div>
              </div>
              <button
                onClick={() => copyToClipboard(link.shortUrl, index)}
                className="ml-2 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {copiedIndex === index ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 