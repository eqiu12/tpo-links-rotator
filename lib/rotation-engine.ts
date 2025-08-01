import { Marker, LinkRotationConfig, ShortenedLink } from './types';
import { shortenUrl, analyzeRecentRotation, getRecentLinksWithStats } from './yourls-api';

/**
 * Gets click percentages for markers from recent links
 * @param markers - Array of markers to analyze
 * @returns Object with marker click percentages
 */
async function getMarkerClickPercentages(markers: Marker[]): Promise<Record<string, number>> {
  try {
    const recentData = await getRecentLinksWithStats(500);
    
    if (!recentData.success || !recentData.links) {
      return {};
    }

    // Filter only Aviasales links and process markers
    const aviasalesLinks = recentData.links
      .filter(link => link.originalUrl.includes('aviasales.ru'))
      .map(link => ({
        ...link,
        marker: link.marker.split('.')[0] // Strip subid
      }));

    // Calculate total clicks
    const totalClicks = aviasalesLinks.reduce((sum, link) => sum + (parseInt(link.clicks.toString()) || 0), 0);
    
    if (totalClicks === 0) {
      return {};
    }

    // Calculate click percentages for each marker
    const clickPercentages: Record<string, number> = {};
    const markerIds = markers.map(m => m.id);
    
    markerIds.forEach(markerId => {
      const markerLinks = aviasalesLinks.filter(link => link.marker === markerId);
      const markerClicks = markerLinks.reduce((sum, link) => sum + (parseInt(link.clicks.toString()) || 0), 0);
      clickPercentages[markerId] = (markerClicks / totalClicks) * 100;
    });

    return clickPercentages;
  } catch (error) {
    console.error('Error getting marker click percentages:', error);
    return {};
  }
}

/**
 * Calculates smart marker distribution based on click percentages and target weights
 * @param markers - Array of markers with their target percentages
 * @param batchSize - Number of links to generate
 * @returns Array of marker IDs in the order they should be used
 */
export function calculateSmartMarkerDistribution(
  markers: Marker[],
  batchSize: number,
  clickPercentages: Record<string, number>
): string[] {
  const distribution: string[] = [];
  const markerIds = markers.map(m => m.id);
  
  // If no click data available, use simple distribution
  if (Object.keys(clickPercentages).length === 0) {
    return calculateMarkerDistribution(markers, batchSize, {});
  }

  // Calculate how much each marker is underperforming
  const underperformance: Record<string, number> = {};
  markers.forEach(marker => {
    const currentClickPercentage = clickPercentages[marker.id] || 0;
    const targetPercentage = marker.percentage;
    underperformance[marker.id] = Math.max(0, targetPercentage - currentClickPercentage);
  });

  // Sort markers by underperformance (highest first)
  const sortedMarkers = [...markers].sort((a, b) => 
    (underperformance[b.id] || 0) - (underperformance[a.id] || 0)
  );

  // Distribute links based on underperformance
  let remainingBatch = batchSize;
  
  // First pass: distribute based on underperformance
  for (const marker of sortedMarkers) {
    if (remainingBatch <= 0) break;
    
    const underperforming = underperformance[marker.id] || 0;
    if (underperforming > 0) {
      // Calculate how many links this marker should get based on underperformance
      const totalUnderperformance = Object.values(underperformance).reduce((sum, val) => sum + val, 0);
      const proportionalLinks = Math.round((underperforming / totalUnderperformance) * batchSize);
      const linksForThisMarker = Math.min(proportionalLinks, remainingBatch);
      
      // Add links for this marker
      for (let i = 0; i < linksForThisMarker; i++) {
        distribution.push(marker.id);
      }
      
      remainingBatch -= linksForThisMarker;
    }
  }

  // Second pass: if there are still remaining links, distribute based on target percentages
  if (remainingBatch > 0) {
    const remainingDistribution = calculateMarkerDistribution(markers, remainingBatch, {});
    distribution.push(...remainingDistribution);
  }

  return distribution;
}

/**
 * Calculates the optimal distribution of markers based on percentages and current usage
 * @param markers - Array of markers with their percentages
 * @param batchSize - Number of links to generate
 * @param currentUsage - Current usage counts for each marker
 * @returns Array of marker IDs in the order they should be used
 */
export function calculateMarkerDistribution(
  markers: Marker[],
  batchSize: number,
  currentUsage: Record<string, number>
): string[] {
  // Calculate target counts for each marker based on percentages
  const targetCounts: Record<string, number> = {};
  const totalPercentage = markers.reduce((sum, marker) => sum + marker.percentage, 0);
  
  markers.forEach(marker => {
    targetCounts[marker.id] = Math.round((marker.percentage / totalPercentage) * batchSize);
  });

  // Adjust for rounding errors to ensure total equals batchSize
  const totalTarget = Object.values(targetCounts).reduce((sum, count) => sum + count, 0);
  if (totalTarget !== batchSize) {
    const diff = batchSize - totalTarget;
    // Add the difference to the marker with the highest percentage
    const highestPercentageMarker = markers.reduce((max, marker) => 
      marker.percentage > max.percentage ? marker : max
    );
    targetCounts[highestPercentageMarker.id] += diff;
  }

  // Calculate how many more links each marker needs
  const remainingCounts: Record<string, number> = {};
  markers.forEach(marker => {
    const current = currentUsage[marker.id] || 0;
    const target = targetCounts[marker.id] || 0;
    remainingCounts[marker.id] = Math.max(0, target - current);
  });

  // Generate the distribution array
  const distribution: string[] = [];
  const markerIds = markers.map(m => m.id);
  
  while (distribution.length < batchSize) {
    // Find the marker with the highest remaining count
    let maxRemaining = 0;
    let selectedMarker = markerIds[0];
    
    for (const markerId of markerIds) {
      if (remainingCounts[markerId] > maxRemaining) {
        maxRemaining = remainingCounts[markerId];
        selectedMarker = markerId;
      }
    }
    
    if (maxRemaining > 0) {
      distribution.push(selectedMarker);
      remainingCounts[selectedMarker]--;
    } else {
      // If no remaining counts, distribute evenly
      const index = distribution.length % markerIds.length;
      distribution.push(markerIds[index]);
    }
  }

  return distribution;
}

/**
 * Creates an affiliate link by appending marker and subid parameters
 * @param originalLink - The original Aviasales link
 * @param marker - The marker ID to append
 * @param subid - Optional subid parameter
 * @returns The complete affiliate link
 */
export function createAffiliateLink(originalLink: string, marker: string, subid?: string): string {
  // Rule 1: Ensure there's a slash (/) before the query parameters
  let baseUrl = originalLink;
  if (!baseUrl.includes('?')) {
    // No query parameters yet, ensure trailing slash
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
  } else {
    // Has query parameters, ensure slash before ?
    const queryIndex = baseUrl.indexOf('?');
    const pathPart = baseUrl.substring(0, queryIndex);
    const queryPart = baseUrl.substring(queryIndex);
    
    if (!pathPart.endsWith('/')) {
      baseUrl = pathPart + '/' + queryPart;
    }
  }
  
  // Rule 2: Build the marker parameter with subid as dot notation
  let markerParam = marker;
  if (subid) {
    markerParam = `${marker}.${subid}`;
  }
  
  // Rule 3: Construct the final URL
  if (baseUrl.includes('?')) {
    // URL already has query parameters, append with &
    return `${baseUrl}&marker=${markerParam}`;
  } else {
    // URL has no query parameters, start with ?
    return `${baseUrl}?marker=${markerParam}`;
  }
}

/**
 * Main function to generate rotated and shortened links
 * @param config - Configuration for link rotation
 * @returns Promise with array of shortened links and distribution info
 */
export async function generateRotatedLinks(config: LinkRotationConfig): Promise<{
  links: ShortenedLink[];
  distributionInfo: {
    clickPercentages: Record<string, number>;
    underperformance: Record<string, number>;
    distribution: string[];
  };
}> {
  try {
    // Get click percentages from recent links
    const clickPercentages = await getMarkerClickPercentages(config.markers);
    
    // Use smart distribution based on click percentages
    const distribution = calculateSmartMarkerDistribution(config.markers, config.batchSize, clickPercentages);
    
    // Calculate underperformance for debugging
    const underperformance: Record<string, number> = {};
    config.markers.forEach(marker => {
      const currentClickPercentage = clickPercentages[marker.id] || 0;
      const targetPercentage = marker.percentage;
      underperformance[marker.id] = Math.max(0, targetPercentage - currentClickPercentage);
    });
    
    // Generate and shorten the links
    const shortenedLinks: ShortenedLink[] = [];
    
    for (let i = 0; i < distribution.length; i++) {
      const marker = distribution[i];
      const affiliateLink = createAffiliateLink(config.originalLink, marker, config.subid);
      
      // Shorten the link (no title - let Yourls extract the page title automatically)
      const shortUrlResponse = await shortenUrl(affiliateLink);
      
      if (shortUrlResponse.status === 'success' && shortUrlResponse.shorturl) {
        shortenedLinks.push({
          originalUrl: affiliateLink,
          shortUrl: shortUrlResponse.shorturl,
          marker: marker,
          subid: config.subid,
          createdAt: new Date().toISOString(),
        });
      } else {
        throw new Error(`Failed to shorten link: ${shortUrlResponse.message}`);
      }
      
      // Add a small delay to avoid overwhelming the API
      if (i < distribution.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      links: shortenedLinks,
      distributionInfo: {
        clickPercentages,
        underperformance,
        distribution,
      },
    };
  } catch (error) {
    console.error('Error generating rotated links:', error);
    throw error;
  }
} 