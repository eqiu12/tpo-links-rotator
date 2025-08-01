import { client } from './database';
import { getRecentLinks } from './yourls-api';

export interface LinkAnalytics {
  id: number;
  shortUrl: string;
  originalUrl: string;
  title: string;
  marker: string;
  subid?: string;
  createdAt: string;
  clicks: number;
  lastUpdated: string;
}

export interface AnalyticsStats {
  totalLinks: number;
  totalClicks: number;
  averageClicksPerLink: number;
  topMarkers: Array<{ marker: string; clicks: number; links: number }>;
  topLinks: Array<{ title: string; clicks: number; marker: string }>;
  monthlyStats: Array<{ month: string; links: number; clicks: number }>;
}

/**
 * Sync link data from Yourls API to local database
 * @param limit - Number of recent links to fetch (default: 1000)
 */
export async function syncLinksFromYourls(limit: number = 500): Promise<{
  success: boolean;
  message: string;
  synced: number;
  total: number;
  updated: number;
  new: number;
}> {
  try {
    console.log(`Starting sync of ${limit} links from Yourls...`);
    
    const yourlsData = await getRecentLinks(limit);
    
    if (yourlsData.status === 'error' || !yourlsData.links) {
      return {
        success: false,
        message: yourlsData.message || 'Failed to fetch links from Yourls',
        synced: 0,
        total: 0,
        updated: 0,
        new: 0
      };
    }

    const links = Object.values(yourlsData.links);
    let syncedCount = 0;
    let updatedCount = 0;
    let newCount = 0;

    for (const link of links) {
      try {
        // Extract marker from URL
        let marker = 'none';
        let subid: string | undefined;
        
        try {
          const url = new URL(link.url);
          const markerParam = url.searchParams.get('marker');
          if (markerParam) {
            const parts = markerParam.split('.');
            marker = parts[0];
            subid = parts[1] || undefined;
          }
        } catch (e) {
          // URL parsing failed, keep marker as 'none'
        }

        // Only store Aviasales links
        if (!link.url.includes('aviasales.ru')) {
          continue;
        }

        // Check if link already exists
        const existingLink = await client.execute(`
          SELECT clicks FROM link_analytics WHERE short_url = ?
        `, [link.shorturl]);

        const isNew = existingLink.rows.length === 0;

        // Insert or update link data
        await client.execute(`
          INSERT OR REPLACE INTO link_analytics 
          (short_url, original_url, title, marker, subid, created_at, clicks, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          link.shorturl,
          link.url,
          link.title || '',
          marker,
          subid || null,
          link.timestamp,
          parseInt(link.clicks.toString()) || 0
        ]);

        syncedCount++;
        if (isNew) {
          newCount++;
        } else {
          updatedCount++;
        }
      } catch (error) {
        console.error('Error syncing link:', link.shorturl, error);
      }
    }

    console.log(`Sync completed: ${syncedCount} links synced (${newCount} new, ${updatedCount} updated) out of ${links.length} total`);

    return {
      success: true,
      message: `Successfully synced ${syncedCount} links (${newCount} new, ${updatedCount} updated)`,
      synced: syncedCount,
      total: links.length,
      updated: updatedCount,
      new: newCount
    };

  } catch (error) {
    console.error('Error syncing links:', error);
    return {
      success: false,
      message: 'Failed to sync links from Yourls',
      synced: 0,
      total: 0,
      updated: 0,
      new: 0
    };
  }
}

/**
 * Get analytics statistics for the specified date range
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 */
export async function getAnalyticsStats(
  startDate: string = '2024-05-01',
  endDate: string = new Date().toISOString().split('T')[0]
): Promise<AnalyticsStats> {
  try {
    // Get total stats
    const totalResult = await client.execute(`
      SELECT 
        COUNT(*) as total_links,
        SUM(clicks) as total_clicks,
        AVG(clicks) as avg_clicks
      FROM link_analytics 
      WHERE created_at >= ? AND created_at <= ?
    `, [startDate, endDate]);

    const totalStats = totalResult.rows[0] as any;

    // Get top markers
    const topMarkersResult = await client.execute(`
      SELECT 
        marker,
        SUM(clicks) as total_clicks,
        COUNT(*) as link_count
      FROM link_analytics 
      WHERE created_at >= ? AND created_at <= ? AND marker != 'none'
      GROUP BY marker
      ORDER BY total_clicks DESC
      LIMIT 10
    `, [startDate, endDate]);

    // Get top performing links
    const topLinksResult = await client.execute(`
      SELECT 
        title,
        clicks,
        marker
      FROM link_analytics 
      WHERE created_at >= ? AND created_at <= ? AND clicks > 0
      ORDER BY clicks DESC
      LIMIT 20
    `, [startDate, endDate]);

    // Get monthly statistics
    const monthlyResult = await client.execute(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as link_count,
        SUM(clicks) as total_clicks
      FROM link_analytics 
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `, [startDate, endDate]);

    return {
      totalLinks: totalStats.total_links || 0,
      totalClicks: totalStats.total_clicks || 0,
      averageClicksPerLink: Math.round((totalStats.avg_clicks || 0) * 100) / 100,
      topMarkers: topMarkersResult.rows.map((row: any) => ({
        marker: row.marker,
        clicks: row.total_clicks,
        links: row.link_count
      })),
      topLinks: topLinksResult.rows.map((row: any) => ({
        title: row.title,
        clicks: row.clicks,
        marker: row.marker
      })),
      monthlyStats: monthlyResult.rows.map((row: any) => ({
        month: row.month,
        links: row.link_count,
        clicks: row.total_clicks
      }))
    };

  } catch (error) {
    console.error('Error getting analytics stats:', error);
    return {
      totalLinks: 0,
      totalClicks: 0,
      averageClicksPerLink: 0,
      topMarkers: [],
      topLinks: [],
      monthlyStats: []
    };
  }
}

/**
 * Get links for a specific date range
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @param limit - Maximum number of links to return
 */
export async function getLinksForDateRange(
  startDate: string,
  endDate: string,
  limit: number = 1000
): Promise<LinkAnalytics[]> {
  try {
    const result = await client.execute(`
      SELECT * FROM link_analytics 
      WHERE created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [startDate, endDate, limit]);

    return result.rows.map((row: any) => ({
      id: row.id,
      shortUrl: row.short_url,
      originalUrl: row.original_url,
      title: row.title,
      marker: row.marker,
      subid: row.subid,
      createdAt: row.created_at,
      clicks: row.clicks,
      lastUpdated: row.last_updated
    }));

  } catch (error) {
    console.error('Error getting links for date range:', error);
    return [];
  }
}

/**
 * Add a new link to analytics (when creating new shortened links)
 */
export async function addLinkToAnalytics(linkData: {
  shortUrl: string;
  originalUrl: string;
  title?: string;
  marker: string;
  subid?: string;
}): Promise<boolean> {
  try {
    await client.execute(`
      INSERT OR REPLACE INTO link_analytics 
      (short_url, original_url, title, marker, subid, created_at, clicks, last_updated)
      VALUES (?, ?, ?, ?, ?, datetime('now'), 0, datetime('now'))
    `, [
      linkData.shortUrl,
      linkData.originalUrl,
      linkData.title || '',
      linkData.marker,
      linkData.subid || null
    ]);

    return true;
  } catch (error) {
    console.error('Error adding link to analytics:', error);
    return false;
  }
} 