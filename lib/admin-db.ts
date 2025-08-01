import { Admin, LoginRequest, LoginResponse } from './types';
import crypto from 'crypto';

// Use global variables to ensure data persists across different contexts
declare global {
  var __activeSessions: Map<string, { adminId: string; expiresAt: Date }> | undefined;
  var __admins: Admin[] | undefined;
}

// Initialize global admin storage
if (!global.__admins) {
  global.__admins = [
    {
      id: '1',
      username: 'admin',
      codephrase: 'travelpayouts2024',
      isActive: true,
      createdAt: new Date().toISOString(),
      apiKey: '', // Add API key field
    },
    {
      id: '2',
      username: 'manager',
      codephrase: 'manager2024',
      isActive: true,
      createdAt: new Date().toISOString(),
      apiKey: '', // Add API key field
    }
  ];
}

const admins = global.__admins;

// Initialize global sessions storage
if (!global.__activeSessions) {
  global.__activeSessions = new Map();
}

const activeSessions = global.__activeSessions;

/**
 * Authenticate admin with username and codephrase
 */
export function authenticateAdmin(request: LoginRequest): LoginResponse {
  const admin = admins.find(a => 
    a.username === request.username && 
    a.codephrase === request.codephrase &&
    a.isActive
  );

  if (!admin) {
    return {
      success: false,
      message: 'Invalid username or codephrase'
    };
  }

  // Generate session token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store session
  activeSessions.set(token, {
    adminId: admin.id,
    expiresAt
  });

  console.log('Session stored:', { token: token.substring(0, 10) + '...', adminId: admin.id, sessionsCount: activeSessions.size });

  // Update last login
  admin.lastLogin = new Date().toISOString();

  return {
    success: true,
    message: 'Login successful',
    admin: {
      id: admin.id,
      username: admin.username,
      codephrase: admin.codephrase,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin,
      apiKey: admin.apiKey || ''
    },
    token
  };
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

  const admin = admins.find(a => a.id === session.adminId);
  console.log('Session valid for admin:', admin?.username);
  return admin || null;
}

/**
 * Logout admin by invalidating session
 */
export function logoutAdmin(token: string): boolean {
  return activeSessions.delete(token);
}

/**
 * Get all admins (for admin management)
 */
export function getAllAdmins(): Admin[] {
  return admins.map(admin => ({
    ...admin,
    codephrase: '***' // Hide codephrase for security
  }));
}

/**
 * Add new admin
 */
export function addAdmin(username: string, codephrase: string): Admin {
  const newAdmin: Admin = {
    id: Date.now().toString(),
    username,
    codephrase,
    isActive: true,
    createdAt: new Date().toISOString(),
    apiKey: ''
  };

  admins.push(newAdmin);
  return newAdmin;
}

/**
 * Update admin status
 */
export function updateAdminStatus(adminId: string, isActive: boolean): boolean {
  const admin = admins.find(a => a.id === adminId);
  if (admin) {
    admin.isActive = isActive;
    return true;
  }
  return false;
}

/**
 * Update admin API key
 */
export function updateAdminApiKey(adminId: string, apiKey: string): boolean {
  const admin = admins.find(a => a.id === adminId);
  if (admin) {
    admin.apiKey = apiKey;
    return true;
  }
  return false;
}

/**
 * Get admin API key
 */
export function getAdminApiKey(adminId: string): string | null {
  const admin = admins.find(a => a.id === adminId);
  return admin?.apiKey || null;
} 