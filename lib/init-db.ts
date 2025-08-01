import { initDatabase } from './database';

let isInitialized = false;

export async function ensureDatabaseInitialized() {
  if (!isInitialized) {
    try {
      await initDatabase();
      isInitialized = true;
      console.log('Database initialization completed');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }
} 