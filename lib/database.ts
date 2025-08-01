import { createClient } from '@libsql/client';

// Database client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Database schema
export const initDatabase = async () => {
  try {
    // Create admins table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        codephrase TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TEXT DEFAULT (datetime('now')),
        last_login TEXT,
        api_key TEXT
      )
    `);

    // Create marker_configs table for storing user's marker preferences
    await client.execute(`
      CREATE TABLE IF NOT EXISTS marker_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id TEXT NOT NULL,
        marker_id TEXT NOT NULL,
        percentage INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
        UNIQUE(admin_id, marker_id)
      )
    `);

    // Create link_analytics table for storing link performance data
    await client.execute(`
      CREATE TABLE IF NOT EXISTS link_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        short_url TEXT UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        title TEXT,
        marker TEXT NOT NULL,
        subid TEXT,
        created_at TEXT NOT NULL,
        clicks INTEGER DEFAULT 0,
        last_updated TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create indexes for link_analytics table
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_link_analytics_marker ON link_analytics (marker)
    `);
    
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_link_analytics_created_at ON link_analytics (created_at)
    `);
    
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_link_analytics_clicks ON link_analytics (clicks)
    `);

    // Insert default admin if not exists
    await client.execute(`
      INSERT OR IGNORE INTO admins (id, username, codephrase, is_active)
      VALUES ('1', 'admin', 'travelpayouts2024', true)
    `);

    await client.execute(`
      INSERT OR IGNORE INTO admins (id, username, codephrase, is_active)
      VALUES ('2', 'manager', 'manager2024', true)
    `);

    await client.execute(`
      INSERT OR IGNORE INTO admins (id, username, codephrase, is_active)
      VALUES ('3', 'euskadi', 'Bilbok0-Ath1etic-Klu8a', true)
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export { client }; 