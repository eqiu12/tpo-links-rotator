import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-service';
import { ensureDatabaseInitialized } from '@/lib/init-db';

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    await ensureDatabaseInitialized();
    
    const body = await request.json();
    const { username, codephrase } = body;

    console.log('Login attempt:', { username, codephrase: codephrase ? '***' : 'missing' });

    // Validate input
    if (!username || !codephrase) {
      console.log('Login failed: missing credentials');
      return NextResponse.json(
        { error: 'Username and codephrase are required' },
        { status: 400 }
      );
    }

    const result = await authenticateAdmin({ username, codephrase });
    console.log('Authentication result:', { success: result.success, message: result.message });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      );
    }

    console.log('Login successful, setting cookie with token:', result.token?.substring(0, 10) + '...');

    // Set HTTP-only cookie with the session token
    const response = NextResponse.json({
      success: true,
      message: result.message,
      admin: result.admin
    });

    response.cookies.set('session_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/' // Ensure cookie is available for all paths
    });

    console.log('Cookie set successfully');
    return response;

  } catch (error) {
    console.error('Error in login API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 