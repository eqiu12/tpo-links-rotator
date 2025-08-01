'use client';

import { useState, useEffect } from 'react';
import { Marker } from '@/lib/types';

interface LinkRotatorFormProps {
  onSubmit: (formData: any) => void;
  loading: boolean;
}

export default function LinkRotatorForm({ onSubmit, loading }: LinkRotatorFormProps) {
  const [links, setLinks] = useState<string[]>(['']);
  const [subid, setSubid] = useState('');
  const [markers, setMarkers] = useState<Marker[]>([
    { id: 'marker1', name: '', percentage: 25 },
    { id: 'marker2', name: '', percentage: 25 },
    { id: 'marker3', name: '', percentage: 25 },
    { id: 'marker4', name: '', percentage: 25 },
  ]);
  const [savedMarkers, setSavedMarkers] = useState<Marker[]>([]);

  const updateMarkerPercentage = (index: number, percentage: number) => {
    const newMarkers = [...markers];
    newMarkers[index].percentage = percentage;
    setMarkers(newMarkers);
  };



  const updateMarkerId = (index: number, id: string) => {
    const newMarkers = [...markers];
    newMarkers[index].id = id;
    setMarkers(newMarkers);
  };

  const addLink = () => {
    setLinks([...links, '']);
  };

  const removeLink = (index: number) => {
    if (links.length > 1) {
      const newLinks = links.filter((_, i) => i !== index);
      setLinks(newLinks);
    }
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty links
    const validLinks = links.filter(link => link.trim());
    
    const formData = {
      originalLinks: validLinks,
      markers,
      batchSize: validLinks.length, // Calculate batch size from number of links
      subid: subid.trim() || undefined,
    };

    // Save marker configuration
    saveMarkerConfig();

    onSubmit(formData);
  };

  const saveMarkerConfig = async () => {
    try {
      const response = await fetch('/api/marker-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markers }),
      });

      if (response.ok) {
        console.log('Marker configuration saved');
      }
    } catch (error) {
      console.error('Failed to save marker configuration:', error);
    }
  };

  const loadMarkerConfig = async () => {
    try {
      const response = await fetch('/api/marker-config');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.markers.length > 0) {
          setMarkers(data.markers);
          setSavedMarkers(data.markers);
        }
      }
    } catch (error) {
      console.error('Failed to load marker configuration:', error);
    }
  };

  // Load saved marker configuration on component mount
  useEffect(() => {
    loadMarkerConfig();
  }, []);

  const totalPercentage = markers.reduce((sum, marker) => sum + marker.percentage, 0);
  const validLinks = links.filter(link => link.trim());
  const isValid = totalPercentage === 100 && validLinks.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Link Rotation Settings</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Smart Distribution:</strong> The system analyzes click performance from your last 500 links and distributes new links to balance marker performance toward your target percentages.
        </p>
      </div>

      {/* Original Links */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Original Aviasales Links *
        </label>
        <div className="space-y-3">
          {links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={link}
                onChange={(e) => updateLink(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://www.aviasales.ru/search/KGD0308SSH1/"
                required={index === 0}
              />
              {links.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-800 focus:outline-none"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addLink}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none"
          >
            + Add another link
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Batch size will be {validLinks.length} (number of links you add)
        </p>
      </div>

      {/* Subid (Optional) */}
      <div>
        <label htmlFor="subid" className="block text-sm font-medium text-gray-700 mb-2">
          Subid (Optional)
        </label>
        <input
          type="text"
          id="subid"
          value={subid}
          onChange={(e) => setSubid(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="campaign_name"
        />
      </div>

      {/* Markers Configuration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Markers & Percentages *
        </label>
        <div className="space-y-3">
          {markers.map((marker, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={marker.id}
                onChange={(e) => updateMarkerId(index, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="marker_id"
              />
              <input
                type="number"
                value={marker.percentage}
                onChange={(e) => updateMarkerPercentage(index, parseInt(e.target.value) || 0)}
                min="0"
                max="100"
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="%"
              />
            </div>
          ))}
        </div>
        
        {/* Percentage validation */}
        <div className={`mt-2 text-sm ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
          Total: {totalPercentage}% {totalPercentage !== 100 && '(must equal 100%)'}
        </div>
      </div>

      {/* Save Configuration Button */}
      <button
        type="button"
        onClick={saveMarkerConfig}
        className="w-full py-2 px-4 rounded-md font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
      >
        💾 Save Marker Configuration
      </button>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || loading}
        className={`w-full py-3 px-4 rounded-md font-medium text-white ${
          isValid && !loading
            ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {loading ? 'Generating Links...' : `Generate ${validLinks.length} Rotated Links`}
      </button>
    </form>
  );
} 