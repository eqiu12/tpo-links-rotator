import axios from 'axios';
import { YourlsApiResponse, YourlsListResponse } from './types';

// Yourls API configuration
const YOURLS_API_URL = process.env.YOURLS_API_URL || 'https://smkt.us/yourls-api.php';

// Function to get the current signature token (allows runtime override)
function getSignatureToken(): string {
  return process.env.YOURLS_SIGNATURE_TOKEN || '05e2685fc7';
}

/**
 * Shortens a URL using the Yourls API
 * @param longUrl - The URL to shorten
 * @param title - Optional title for the shortlink
 * @returns Promise with the shortened URL response
 */
export async function shortenUrl(longUrl: string, title?: string): Promise<YourlsApiResponse> {
  try {
    const params = new URLSearchParams({
      signature: getSignatureToken(),
      action: 'shorturl',
      url: longUrl,
      format: 'json',
    });

    if (title) {
      params.append('title', title);
    }

    const response = await axios.post(YOURLS_API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error shortening URL:', error);
    throw new Error('Failed to shorten URL');
  }
}

/**
 * Fetches recent shortlinks from Yourls API using the 'stats' action
 * @param limit - Number of recent links to fetch
 * @returns Promise with the list of recent links
 */
export async function getRecentLinks(limit: number = 100): Promise<YourlsListResponse> {
  try {
    const params = new URLSearchParams({
      signature: getSignatureToken(),
      action: 'stats',
      filter: 'last',
      limit: limit.toString(),
      format: 'json',
    });

    const response = await axios.post(YOURLS_API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching recent links:', error);
    return {
      status: 'error',
      message: 'Failed to fetch recent links',
      links: {}
    };
  }
}

/**
 * Fetches recent links and analyzes them for marker distribution
 * @param limit - Number of recent links to fetch (default: 250)
 * @returns Promise with links data and marker statistics
 */
export async function getRecentLinksWithStats(limit: number = 250) {
  try {
    const recentLinks = await getRecentLinks(limit);
    
    if (recentLinks.status === 'error' || !recentLinks.links) {
      return {
        success: false,
        message: recentLinks.message || 'Failed to fetch recent links',
        links: [],
        stats: {}
      };
    }

    const links = Object.values(recentLinks.links).map(link => ({
      shortUrl: link.shorturl,
      originalUrl: link.url,
      title: link.title,
      timestamp: link.timestamp,
      clicks: link.clicks,
      ip: link.ip
    }));

    // Analyze markers in the URLs
    const markerStats: Record<string, number> = {};
    const linksWithMarkers = links.map(link => {
      let marker = 'none';
      
      try {
        // Extract marker from URL if it contains marker parameter
        const url = new URL(link.originalUrl);
        const markerParam = url.searchParams.get('marker');
        if (markerParam) {
          marker = markerParam;
          markerStats[marker] = (markerStats[marker] || 0) + 1;
        } else {
          markerStats['none'] = (markerStats['none'] || 0) + 1;
        }
      } catch (error) {
        // If URL parsing fails, mark as none
        markerStats['none'] = (markerStats['none'] || 0) + 1;
      }

      return {
        ...link,
        marker
      };
    });

    return {
      success: true,
      links: linksWithMarkers,
      stats: markerStats,
      totalLinks: linksWithMarkers.length
    };

  } catch (error) {
    console.error('Error fetching recent links with stats:', error);
    return {
      success: false,
      message: 'Failed to fetch recent links',
      links: [],
      stats: {}
    };
  }
}

/**
 * Analyzes recent links to determine the current rotation state
 * @param originalLink - The original Aviasales link to match
 * @param markers - Array of marker IDs to track
 * @param limit - Number of recent links to analyze
 * @returns Object with marker usage counts
 */
export async function analyzeRecentRotation(
  originalLink: string,
  markers: string[],
  limit: number = 100
): Promise<Record<string, number>> {
  try {
    const recentLinks = await getRecentLinks(limit);
    const markerCounts: Record<string, number> = {};
    
    // Initialize counts
    markers.forEach(marker => {
      markerCounts[marker] = 0;
    });

    if (recentLinks.links) {
      // Filter links that match the original URL pattern and contain our markers
      Object.values(recentLinks.links).forEach(link => {
        if (link.url.includes(originalLink)) {
          // Extract marker from URL if it contains one of our markers
          for (const marker of markers) {
            if (link.url.includes(`marker=${marker}`)) {
              markerCounts[marker]++;
              break;
            }
          }
        }
      });
    }

    return markerCounts;
  } catch (error) {
    console.error('Error analyzing recent rotation:', error);
    // Return zero counts if analysis fails
    const markerCounts: Record<string, number> = {};
    markers.forEach(marker => {
      markerCounts[marker] = 0;
    });
    return markerCounts;
  }
} 