import { NextRequest, NextResponse } from 'next/server';
import { validateSession, saveMarkerConfig, getMarkerConfig } from '@/lib/admin-service';
import { Marker } from '@/lib/types';
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
    const { markers } = body;

    if (!markers || !Array.isArray(markers)) {
      return NextResponse.json(
        { error: 'Markers array is required' },
        { status: 400 }
      );
    }

    // Validate markers
    const totalPercentage = markers.reduce((sum: number, marker: Marker) => sum + marker.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 1) {
      return NextResponse.json(
        { error: 'Marker percentages must sum to 100%' },
        { status: 400 }
      );
    }

    const success = await saveMarkerConfig(admin.id, markers);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save marker configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Marker configuration saved successfully'
    });

  } catch (error) {
    console.error('Error in marker-config API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const markers = await getMarkerConfig(admin.id);

    return NextResponse.json({
      success: true,
      markers
    });

  } catch (error) {
    console.error('Error in marker-config API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 