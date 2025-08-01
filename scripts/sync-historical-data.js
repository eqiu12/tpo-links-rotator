#!/usr/bin/env node

import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Database client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Yourls API configuration
const YOURLS_API_URL = process.env.YOURLS_API_URL;
const YOURLS_SIGNATURE_TOKEN = process.env.YOURLS_SIGNATURE_TOKEN;

if (!YOURLS_API_URL || !YOURLS_SIGNATURE_TOKEN) {
  console.error('Missing Yourls API configuration. Please check your .env.local file.');
  process.exit(1);
}

// Function to fetch links from Yourls API with different filters
async function fetchLinksFromYourls(limit = 1000, filter = 'last') {
  const params = new URLSearchParams({
    signature: YOURLS_SIGNATURE_TOKEN,
    action: 'stats',
    filter: filter,
    limit: limit.toString(),
    format: 'json'
  });

  const url = `${YOURLS_API_URL}?${params.toString()}`;
  
  try {
    console.log(`Fetching ${limit} links with filter '${filter}' from Yourls API...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.statusCode === 200 && data.links) {
      console.log(`Successfully fetched ${Object.keys(data.links).length} links`);
      return data.links;
    } else {
      throw new Error(`Invalid response from Yourls API: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error fetching links from Yourls:', error);
    throw error;
  }
}

// Function to insert or update link in database
async function insertOrUpdateLink(linkData) {
  const { shorturl, url, title, timestamp, clicks } = linkData;
  
  // Extract marker from URL if it's an Aviasales link
  let marker = null;
  let subid = null;
  
  if (url.includes('aviasales.ru')) {
    const markerMatch = url.match(/marker=([^&]+)/);
    const subidMatch = url.match(/subid=([^&]+)/);
    
    if (markerMatch) {
      marker = markerMatch[1];
    }
    if (subidMatch) {
      subid = subidMatch[1];
    }
  }
  
  try {
    await client.execute({
      sql: `
        INSERT OR REPLACE INTO link_analytics 
        (short_url, original_url, title, marker, subid, created_at, clicks, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        shorturl,
        url,
        title || '',
        marker || '',
        subid || null,
        timestamp,
        parseInt(clicks) || 0
      ]
    });
  } catch (error) {
    console.error(`Error inserting link ${shorturl}:`, error);
  }
}

// Main sync function for historical data
async function syncHistoricalData() {
  try {
    console.log('Starting historical Yourls data sync...');
    
    const filters = ['last', 'top', 'bottom', 'rand'];
    let totalProcessed = 0;
    let totalAviasalesLinks = 0;
    
    for (const filter of filters) {
      console.log(`\n=== Processing filter: ${filter} ===`);
      
      // Fetch links with current filter
      const links = await fetchLinksFromYourls(1000, filter);
      
      if (!links || Object.keys(links).length === 0) {
        console.log(`No links found for filter: ${filter}`);
        continue;
      }
      
      console.log(`Processing ${Object.keys(links).length} links for filter: ${filter}...`);
      
      // Process each link
      let processed = 0;
      let aviasalesLinks = 0;
      
      for (const [keyword, linkData] of Object.entries(links)) {
        processed++;
        
        // Only process Aviasales links
        if (linkData.url && linkData.url.includes('aviasales.ru')) {
          aviasalesLinks++;
          await insertOrUpdateLink(linkData);
          
          if (aviasalesLinks % 100 === 0) {
            console.log(`Processed ${aviasalesLinks} Aviasales links for ${filter}...`);
          }
        }
      }
      
      totalProcessed += processed;
      totalAviasalesLinks += aviasalesLinks;
      
      console.log(`Filter ${filter} completed: ${processed} total, ${aviasalesLinks} Aviasales links`);
      
      // Small delay between requests to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n=== Historical Sync completed! ===`);
    console.log(`Total links processed: ${totalProcessed}`);
    console.log(`Total Aviasales links synced: ${totalAviasalesLinks}`);
    
    // Get comprehensive statistics
    const stats = await client.execute(`
      SELECT 
        COUNT(*) as total_links,
        SUM(clicks) as total_clicks,
        COUNT(DISTINCT marker) as unique_markers,
        MIN(created_at) as earliest_link,
        MAX(created_at) as latest_link,
        AVG(clicks) as avg_clicks
      FROM link_analytics
    `);
    
    if (stats.rows.length > 0) {
      const row = stats.rows[0];
      console.log(`\n=== Database Statistics ===`);
      console.log(`Total links in database: ${row.total_links}`);
      console.log(`Total clicks: ${row.total_clicks}`);
      console.log(`Unique markers: ${row.unique_markers}`);
      console.log(`Earliest link: ${row.earliest_link}`);
      console.log(`Latest link: ${row.latest_link}`);
      console.log(`Average clicks per link: ${Math.round(row.avg_clicks)}`);
    }
    
    // Get top markers by clicks
    const topMarkers = await client.execute(`
      SELECT 
        marker,
        COUNT(*) as link_count,
        SUM(clicks) as total_clicks,
        AVG(clicks) as avg_clicks
      FROM link_analytics 
      WHERE marker != ''
      GROUP BY marker 
      ORDER BY total_clicks DESC 
      LIMIT 10
    `);
    
    if (topMarkers.rows.length > 0) {
      console.log(`\n=== Top 10 Markers by Clicks ===`);
      topMarkers.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.marker}: ${row.total_clicks} clicks (${row.link_count} links, avg: ${Math.round(row.avg_clicks)})`);
      });
    }
    
  } catch (error) {
    console.error('Error during historical sync:', error);
    process.exit(1);
  }
}

// Run the historical sync
syncHistoricalData().then(() => {
  console.log('\nHistorical sync script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Historical sync script failed:', error);
  process.exit(1);
}); 