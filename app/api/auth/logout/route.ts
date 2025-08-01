import { NextRequest, NextResponse } from 'next/server';
import { logoutAdmin } from '@/lib/admin-service';
import { ensureDatabaseInitialized } from '@/lib/init-db';

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    await ensureDatabaseInitialized();
    
    const token = request.cookies.get('session_token')?.value;
    
    if (token) {
      logoutAdmin(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the session cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Error in logout API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 