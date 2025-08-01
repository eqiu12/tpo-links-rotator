import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/admin-service';
import { ensureDatabaseInitialized } from '@/lib/init-db';

export async function GET(request: NextRequest) {
  try {
    // Ensure database is initialized
    await ensureDatabaseInitialized();
    
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No session token found' },
        { status: 401 }
      );
    }

    const admin = validateSession(token);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Error in auth check API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 