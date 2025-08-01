import { client } from './database';
import { Admin, LoginRequest, LoginResponse, Marker } from './types';
import crypto from 'crypto';

// In-memory session storage (for now, could be moved to database later)
declare global {
  var __activeSessions: Map<string, { adminId: string; expiresAt: Date }> | undefined;
}

if (!global.__activeSessions) {
  global.__activeSessions = new Map();
}

const activeSessions = global.__activeSessions;

/**
 * Authenticate admin with username and codephrase
 */
export async function authenticateAdmin(request: LoginRequest): Promise<LoginResponse> {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM admins WHERE username = ? AND codephrase = ? AND is_active = true',
      args: [request.username, request.codephrase]
    });

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Invalid username or codephrase'
      };
    }

    const admin = result.rows[0] as any;

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session
    activeSessions.set(token, {
      adminId: admin.id,
      expiresAt
    });

    // Update last login
    await client.execute({
      sql: 'UPDATE admins SET last_login = ? WHERE id = ?',
      args: [new Date().toISOString(), admin.id]
    });

    console.log('Session stored:', { token: token.substring(0, 10) + '...', adminId: admin.id, sessionsCount: activeSessions.size });

    return {
      success: true,
      message: 'Login successful',
      admin: {
        id: admin.id,
        username: admin.username,
        codephrase: admin.codephrase,
        isActive: admin.is_active,
        createdAt: admin.created_at,
        lastLogin: admin.last_login,
        apiKey: admin.api_key || ''
      },
      token
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      message: 'Authentication failed'
    };
  }
}

/**
 * Validate session token
 */
export function validateSession(token: string): Admin | null {
  console.log('Validating session token:', token.substring(0, 10) + '...', 'Sessions count:', activeSessions.size);
  
  const session = activeSessions.get(token);
  
  if (!session) {
    console.log('Session not found');
    return null;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    console.log('Session expired');
    activeSessions.delete(token);
    return null;
  }

  // For now, return a basic admin object. In a full implementation,
  // you'd fetch the admin from the database
  return {
    id: session.adminId,
    username: 'admin', // This would be fetched from DB
    codephrase: '',
    isActive: true,
    createdAt: new Date().toISOString(),
    apiKey: ''
  };
}

/**
 * Logout admin by invalidating session
 */
export function logoutAdmin(token: string): boolean {
  return activeSessions.delete(token);
}

/**
 * Update admin API key
 */
export async function updateAdminApiKey(adminId: string, apiKey: string): Promise<boolean> {
  try {
    const result = await client.execute({
      sql: 'UPDATE admins SET api_key = ? WHERE id = ?',
      args: [apiKey, adminId]
    });

    return result.rowsAffected > 0;
  } catch (error) {
    console.error('Error updating API key:', error);
    return false;
  }
}

/**
 * Get admin API key
 */
export async function getAdminApiKey(adminId: string): Promise<string | null> {
  try {
    const result = await client.execute({
      sql: 'SELECT api_key FROM admins WHERE id = ?',
      args: [adminId]
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].api_key as string || null;
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
}

/**
 * Save marker configuration for an admin
 */
export async function saveMarkerConfig(adminId: string, markers: Marker[]): Promise<boolean> {
  try {
    // Delete existing configs for this admin
    await client.execute({
      sql: 'DELETE FROM marker_configs WHERE admin_id = ?',
      args: [adminId]
    });

    // Insert new configs
    for (const marker of markers) {
      await client.execute({
        sql: 'INSERT INTO marker_configs (admin_id, marker_id, percentage) VALUES (?, ?, ?)',
        args: [adminId, marker.id, marker.percentage]
      });
    }

    return true;
  } catch (error) {
    console.error('Error saving marker config:', error);
    return false;
  }
}

/**
 * Get marker configuration for an admin
 */
export async function getMarkerConfig(adminId: string): Promise<Marker[]> {
  try {
    const result = await client.execute({
      sql: 'SELECT marker_id, percentage FROM marker_configs WHERE admin_id = ? ORDER BY id',
      args: [adminId]
    });

    return result.rows.map((row: any) => ({
      id: row.marker_id,
      percentage: row.percentage
    }));
  } catch (error) {
    console.error('Error getting marker config:', error);
    return [];
  }
} 