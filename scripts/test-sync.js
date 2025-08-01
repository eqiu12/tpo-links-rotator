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

// Test the sync functionality
async function testSync() {
  try {
    console.log('Testing sync functionality...');
    
    // Get current database stats
    const beforeStats = await client.execute(`
      SELECT COUNT(*) as total_links, SUM(clicks) as total_clicks
      FROM link_analytics
    `);
    
    console.log('Before sync:');
    console.log(`- Total links: ${beforeStats.rows[0].total_links}`);
    console.log(`- Total clicks: ${beforeStats.rows[0].total_clicks}`);
    
    // Import and run the sync function
    const { syncLinksFromYourls } = await import('../lib/analytics-service.ts');
    
    console.log('\nRunning sync...');
    const result = await syncLinksFromYourls(500);
    
    console.log('\nSync result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Message: ${result.message}`);
    console.log(`- Total processed: ${result.total}`);
    console.log(`- Synced: ${result.synced}`);
    console.log(`- New links: ${result.new}`);
    console.log(`- Updated links: ${result.updated}`);
    
    // Get updated database stats
    const afterStats = await client.execute(`
      SELECT COUNT(*) as total_links, SUM(clicks) as total_clicks
      FROM link_analytics
    `);
    
    console.log('\nAfter sync:');
    console.log(`- Total links: ${afterStats.rows[0].total_links}`);
    console.log(`- Total clicks: ${afterStats.rows[0].total_clicks}`);
    
    const linkDiff = afterStats.rows[0].total_links - beforeStats.rows[0].total_links;
    const clickDiff = afterStats.rows[0].total_clicks - beforeStats.rows[0].total_clicks;
    
    console.log('\nChanges:');
    console.log(`- Links added: ${linkDiff}`);
    console.log(`- Clicks updated: +${clickDiff}`);
    
    console.log('\n✅ Sync test completed successfully!');
    
  } catch (error) {
    console.error('❌ Sync test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSync().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
}); 