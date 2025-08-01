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

// Function to get unique short URLs from database
async function getExistingShortUrls() {
  const result = await client.execute(`
    SELECT short_url FROM link_analytics
  `);
  return new Set(result.rows.map(row => row.short_url));
}

// Main function to fetch all historical data
async function fetchAllHistoricalData() {
  try {
    console.log('🚀 Starting comprehensive historical data fetch...');
    
    // Get existing short URLs to avoid duplicates
    console.log('📋 Getting existing short URLs from database...');
    const existingUrls = await getExistingShortUrls();
    console.log(`Found ${existingUrls.size} existing links in database`);
    
    const filters = ['last', 'top', 'bottom', 'rand'];
    let totalProcessed = 0;
    let totalAviasalesLinks = 0;
    let totalNewLinks = 0;
    let totalUpdatedLinks = 0;
    let allFetchedLinks = new Set(); // Track all fetched links to avoid duplicates
    
    for (const filter of filters) {
      console.log(`\n=== Processing filter: ${filter} ===`);
      
      // Fetch multiple batches for each filter to get more comprehensive data
      const batches = [1000, 1000, 1000, 1000, 1000]; // 5 batches of 1000 each
      
      for (let i = 0; i < batches.length; i++) {
        const limit = batches[i];
        console.log(`\n--- Batch ${i + 1}/${batches.length} (${limit} links) ---`);
        
        try {
          // Fetch links with current filter and batch size
          const links = await fetchLinksFromYourls(limit, filter);
          
          if (!links || Object.keys(links).length === 0) {
            console.log(`No more links found for filter: ${filter}, batch: ${i + 1}`);
            break;
          }
          
          console.log(`Processing ${Object.keys(links).length} links for ${filter}, batch ${i + 1}...`);
          
          // Process each link
          let processed = 0;
          let aviasalesLinks = 0;
          let newLinks = 0;
          let updatedLinks = 0;
          
          for (const [keyword, linkData] of Object.entries(links)) {
            processed++;
            
            // Skip if we've already processed this link in this session
            if (allFetchedLinks.has(linkData.shorturl)) {
              continue;
            }
            allFetchedLinks.add(linkData.shorturl);
            
            // Only process Aviasales links
            if (linkData.url && linkData.url.includes('aviasales.ru')) {
              aviasalesLinks++;
              
              // Check if this is a new link
              const isNew = !existingUrls.has(linkData.shorturl);
              
              await insertOrUpdateLink(linkData);
              
              if (isNew) {
                newLinks++;
                existingUrls.add(linkData.shorturl); // Add to set to avoid future duplicates
              } else {
                updatedLinks++;
              }
              
              if (aviasalesLinks % 100 === 0) {
                console.log(`  Processed ${aviasalesLinks} Aviasales links for ${filter}, batch ${i + 1}...`);
              }
            }
          }
          
          totalProcessed += processed;
          totalAviasalesLinks += aviasalesLinks;
          totalNewLinks += newLinks;
          totalUpdatedLinks += updatedLinks;
          
          console.log(`Batch ${i + 1} completed: ${processed} total, ${aviasalesLinks} Aviasales (${newLinks} new, ${updatedLinks} updated)`);
          
          // Small delay between batches to be respectful to the API
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`Error in batch ${i + 1} for filter ${filter}:`, error);
          // Continue with next batch
        }
      }
    }
    
    console.log(`\n🎉 === Comprehensive Historical Fetch completed! ===`);
    console.log(`Total links processed: ${totalProcessed}`);
    console.log(`Total Aviasales links synced: ${totalAviasalesLinks}`);
    console.log(`New links added: ${totalNewLinks}`);
    console.log(`Existing links updated: ${totalUpdatedLinks}`);
    console.log(`Total unique links fetched: ${allFetchedLinks.size}`);
    
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
      console.log(`\n📊 === Final Database Statistics ===`);
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
      WHERE marker != '' AND marker != 'none'
      GROUP BY marker 
      ORDER BY total_clicks DESC 
      LIMIT 15
    `);
    
    if (topMarkers.rows.length > 0) {
      console.log(`\n🏆 === Top 15 Markers by Clicks ===`);
      topMarkers.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.marker}: ${row.total_clicks} clicks (${row.link_count} links, avg: ${Math.round(row.avg_clicks)})`);
      });
    }
    
    // Check if we reached the target of 8200+ links
    const finalCount = stats.rows[0].total_links;
    if (finalCount >= 8200) {
      console.log(`\n✅ SUCCESS! Reached target of 8200+ links: ${finalCount} links in database`);
    } else {
      console.log(`\n⚠️  Target not reached: ${finalCount} links (target: 8200+)`);
      console.log('Consider running the script again or adjusting the fetch strategy');
    }
    
  } catch (error) {
    console.error('❌ Error during comprehensive historical fetch:', error);
    process.exit(1);
  }
}

// Run the comprehensive fetch
console.log('🔍 Starting comprehensive historical data fetch for 8200+ links...');
fetchAllHistoricalData().then(() => {
  console.log('\n🎯 Comprehensive historical fetch completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Comprehensive historical fetch failed:', error);
  process.exit(1);
}); 