import { NextRequest, NextResponse } from 'next/server';
import { generateRotatedLinks } from '@/lib/rotation-engine';
import { LinkRotationConfig } from '@/lib/types';
import { validateSession, getAdminApiKey } from '@/lib/admin-service';
import { ensureDatabaseInitialized } from '@/lib/init-db';

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    await ensureDatabaseInitialized();
    
    const body = await request.json();
    const { originalLink, markers, batchSize, subid } = body;

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
    if (!userApiKey) {
      return NextResponse.json(
        { error: 'No API key configured. Please add your Yourls API key in the header.' },
        { status: 400 }
      );
    }

    // Validate input
    if (!originalLink || !markers || !batchSize) {
      return NextResponse.json(
        { error: 'Missing required fields: originalLink, markers, batchSize' },
        { status: 400 }
      );
    }

    // Validate Aviasales URL
    if (!originalLink.includes('aviasales.ru')) {
      return NextResponse.json(
        { error: 'Invalid URL. Please provide a valid Aviasales.ru link' },
        { status: 400 }
      );
    }

    // Validate markers
    if (!Array.isArray(markers) || markers.length === 0) {
      return NextResponse.json(
        { error: 'Markers must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate percentages sum to 100
    const totalPercentage = markers.reduce((sum, marker) => sum + marker.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 1) { // Allow small rounding errors
      return NextResponse.json(
        { error: 'Marker percentages must sum to 100%' },
        { status: 400 }
      );
    }

    // Validate batch size
    if (batchSize < 1 || batchSize > 100) {
      return NextResponse.json(
        { error: 'Batch size must be between 1 and 100' },
        { status: 400 }
      );
    }

    const config: LinkRotationConfig = {
      originalLink,
      markers,
      batchSize,
      subid,
    };

    // Temporarily set the user's API key for this request
    const originalApiKey = process.env.YOURLS_SIGNATURE_TOKEN;
    process.env.YOURLS_SIGNATURE_TOKEN = userApiKey;

    try {
      const result = await generateRotatedLinks(config);

      return NextResponse.json({
        success: true,
        links: result.links,
        distributionInfo: result.distributionInfo,
        summary: {
          totalGenerated: result.links.length,
          markersUsed: markers.map(m => ({
            id: m.id,
            count: result.links.filter(link => link.marker === m.id).length,
            currentClickPercentage: result.distributionInfo.clickPercentages[m.id] || 0,
            targetPercentage: m.percentage,
            underperformance: result.distributionInfo.underperformance[m.id] || 0,
          })),
        },
      });
    } finally {
      // Restore the original API key
      process.env.YOURLS_SIGNATURE_TOKEN = originalApiKey;
    }

  } catch (error) {
    console.error('Error in rotate-links API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 