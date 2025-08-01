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

    // Insert default admin if not exists
    await client.execute(`
      INSERT OR IGNORE INTO admins (id, username, codephrase, is_active)
      VALUES ('1', 'admin', 'travelpayouts2024', true)
    `);

    await client.execute(`
      INSERT OR IGNORE INTO admins (id, username, codephrase, is_active)
      VALUES ('2', 'manager', 'manager2024', true)
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export { client }; 