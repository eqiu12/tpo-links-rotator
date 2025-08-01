import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/admin-service';
import { syncLinksFromYourls } from '@/lib/analytics-service';
import { ensureDatabaseInitialized } from '@/lib/init-db';

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    await ensureDatabaseInitialized();
    
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
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

    const body = await request.json();
    const { limit = 500 } = body; // Default to 500 links for faster sync

    const result = await syncLinksFromYourls(limit);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in analytics sync API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 