import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/admin-service';
import { getAnalyticsStats } from '@/lib/analytics-service';
import { ensureDatabaseInitialized } from '@/lib/init-db';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2024-05-01';
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    const stats = await getAnalyticsStats(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error in analytics stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 