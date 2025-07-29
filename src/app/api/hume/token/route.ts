import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.HUME_API_KEY;
  const clientSecret = process.env.HUME_CLIENT_SECRET;

  if (!apiKey || !clientSecret) {
    return NextResponse.json(
      { error: 'HUME_API_KEY or HUME_CLIENT_SECRET is not set' },
      { status: 500 }
    );
  }

  try {
    const authString = Buffer.from(`${apiKey}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://api.hume.ai/oauth2-cc/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error from Hume API:', data);
      return NextResponse.json(
        { error: 'Failed to fetch Hume access token', details: data },
        { status: response.status }
      );
    }
    
    return NextResponse.json({ accessToken: data.access_token });
  } catch (error) {
    console.error('Error fetching Hume access token:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 