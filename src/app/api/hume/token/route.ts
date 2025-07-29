import { HumeClient } from 'hume';
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
    const hume = new HumeClient({ apiKey, clientSecret });
    const accessToken = await hume.getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to fetch Hume access token' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error('Error fetching Hume access token:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 