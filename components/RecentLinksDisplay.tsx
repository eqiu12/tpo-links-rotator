'use client';

import { useState, useEffect } from 'react';

interface LinkData {
  shortUrl: string;
  originalUrl: string;
  title: string;
  timestamp: string;
  clicks: number;
  ip: string;
  marker: string;
}

interface RecentLinksData {
  links: LinkData[];
  stats: Record<string, number>;
  totalLinks: number;
}

export default function RecentLinksDisplay() {
  const [data, setData] = useState<RecentLinksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string>('all');
  const [limit, setLimit] = useState(500);

  const fetchRecentLinks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/recent-links?limit=${limit}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch recent links');
      }

      // Filter only Aviasales.ru links and process markers
      const filteredData = {
        ...result.data,
        links: result.data.links
          .filter((link: any) => link.originalUrl.includes('aviasales.ru'))
          .map((link: any) => ({
            ...link,
            marker: link.marker.split('.')[0] // Strip subid from marker
          }))
      };

      // Recalculate stats based on filtered and processed data
      const markerStats: Record<string, number> = {};
      filteredData.links.forEach((link: any) => {
        markerStats[link.marker] = (markerStats[link.marker] || 0) + 1;
      });

      filteredData.stats = markerStats;
      filteredData.totalLinks = filteredData.links.length;

      setData(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentLinks();
  }, [limit]);

  const filteredLinks = data?.links.filter(link => 
    selectedMarker === 'all' || link.marker === selectedMarker
  ) || [];

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportToCSV = () => {
    if (!data) return;

    const headers = ['Short URL', 'Original URL', 'Title', 'Marker', 'Clicks', 'Created At', 'IP'];
    const csvContent = [
      headers.join(','),
      ...filteredLinks.map(link => [
        link.shortUrl,
        link.originalUrl,
        `"${link.title.replace(/"/g, '""')}"`,
        link.marker,
        link.clicks,
        link.timestamp,
        link.ip
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recent-links-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Recent Links</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading recent links...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Recent Links</h2>
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
              <button
                onClick={fetchRecentLinks}
                className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Recent Links</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Loading recent links...</p>
        </div>
      </div>
    );
  }

  const markers = Object.keys(data.stats).sort((a, b) => data.stats[b] - data.stats[a]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Recent Links ({data.totalLinks})</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing only Aviasales.ru links • Markers grouped (subids removed)
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Export CSV
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={500}>500</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Marker</label>
          <select
            value={selectedMarker}
            onChange={(e) => setSelectedMarker(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Markers</option>
            {markers.map(marker => (
              <option key={marker} value={marker}>
                {marker} ({data.stats[marker]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Marker Performance Dashboard</h3>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm font-medium text-gray-500">Total Links</div>
            <div className="text-2xl font-bold text-gray-900">{data.totalLinks}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm font-medium text-gray-500">Total Clicks</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.links.reduce((sum, link) => sum + (parseInt(link.clicks.toString()) || 0), 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm font-medium text-gray-500">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">
              {(data.links.reduce((sum, link) => sum + (parseInt(link.clicks.toString()) || 0), 0) * 4).toLocaleString()} ₽
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm font-medium text-gray-500">Active Markers</div>
            <div className="text-2xl font-bold text-gray-900">
              {markers.filter(m => m !== 'none').length}
            </div>
          </div>
        </div>

        {/* Marker Statistics Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Links
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Links %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Clicks/Link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rev (₽)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {markers.map(marker => {
                const markerLinks = data.links.filter(link => link.marker === marker);
                const totalClicks = markerLinks.reduce((sum, link) => sum + (parseInt(link.clicks.toString()) || 0), 0);
                const totalClicksAll = data.links.reduce((sum, link) => sum + (parseInt(link.clicks.toString()) || 0), 0);
                const avgClicks = markerLinks.length > 0 ? (totalClicks / markerLinks.length).toFixed(1) : '0';
                const revenue = totalClicks * 4; // 4 roubles per click
                
                return (
                  <tr key={marker} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        marker === 'none' 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {marker}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {markerLinks.length.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {((markerLinks.length / data.totalLinks) * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {totalClicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {totalClicksAll > 0 ? ((totalClicks / totalClicksAll) * 100).toFixed(1) : '0'}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {avgClicks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {revenue.toLocaleString()} ₽
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Links Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Short URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLinks.map((link, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      {link.shortUrl}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      link.marker === 'none' 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {link.marker}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {link.clicks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(link.timestamp)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">
                    {link.title}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLinks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No links found with the selected filter.</p>
        </div>
      )}
    </div>
  );
} 