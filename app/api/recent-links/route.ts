import { NextRequest, NextResponse } from 'next/server';
import { getRecentLinksWithStats } from '@/lib/yourls-api';
import { validateSession, getAdminApiKey } from '@/lib/admin-service';
import { ensureDatabaseInitialized } from '@/lib/init-db';

export async function GET(request: NextRequest) {
  try {
    // Ensure database is initialized
    await ensureDatabaseInitialized();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '250');

    // Session-based authentication
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

    // Get the user's API key
    const userApiKey = await getAdminApiKey(admin.id);
    console.log('Getting API key for admin:', admin.id, 'API key found:', !!userApiKey);
    if (!userApiKey) {
      return NextResponse.json(
        { error: 'No API key configured. Please add your Yourls API key in the header.' },
        { status: 400 }
      );
    }

    // Validate limit
    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 1000' },
        { status: 400 }
      );
    }

    // Temporarily set the user's API key for this request
    const originalApiKey = process.env.YOURLS_SIGNATURE_TOKEN;
    process.env.YOURLS_SIGNATURE_TOKEN = userApiKey;

    try {
      const result = await getRecentLinksWithStats(limit);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
    } finally {
      // Restore the original API key
      process.env.YOURLS_SIGNATURE_TOKEN = originalApiKey;
    }

  } catch (error) {
    console.error('Error in recent-links API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 