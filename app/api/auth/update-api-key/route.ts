import { NextRequest, NextResponse } from 'next/server';
import { validateSession, updateAdminApiKey, getAdminApiKey } from '@/lib/admin-service';
import { getRecentLinksWithStats } from '@/lib/yourls-api';
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
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Test the API key by trying to fetch recent links
    try {
      // Temporarily set the API key for testing
      const originalApiKey = process.env.YOURLS_SIGNATURE_TOKEN;
      process.env.YOURLS_SIGNATURE_TOKEN = apiKey;
      
      const testResult = await getRecentLinksWithStats(10); // Test with just 10 links
      
      // Restore original API key
      process.env.YOURLS_SIGNATURE_TOKEN = originalApiKey;

      if (!testResult.success) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your Yourls API credentials.' },
          { status: 400 }
        );
      }

          // API key is valid, save it to the database
    const success = await updateAdminApiKey(admin.id, apiKey);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save API key' },
        { status: 500 }
      );
    }

    console.log('API key saved successfully for admin:', admin.id);

      return NextResponse.json({
        success: true,
        message: 'API key updated successfully and verified with Yourls API',
        linksCount: testResult.totalLinks
      });

    } catch (error) {
      console.error('Error testing API key:', error);
      return NextResponse.json(
        { error: 'Failed to verify API key with Yourls API. Please check your credentials.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in update-api-key API:', error);
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

    const apiKey = await getAdminApiKey(admin.id);

    return NextResponse.json({
      success: true,
      apiKey: apiKey || '',
      hasApiKey: !!apiKey
    });

  } catch (error) {
    console.error('Error in get-api-key API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 