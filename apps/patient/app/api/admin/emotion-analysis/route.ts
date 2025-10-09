import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const participantId = searchParams.get('participantId');
  const videoFile = searchParams.get('videoFile');
  const sessionType = searchParams.get('sessionType');

  try {
    // Backend APIを呼び出す
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
    const params = new URLSearchParams();
    params.append('action', action || '');
    if (participantId) params.append('participantId', participantId);
    if (videoFile) params.append('videoFile', videoFile);
    if (sessionType) params.append('sessionType', sessionType);

    const response = await fetch(`${backendUrl}/api/emotion-analysis?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend API error' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error in emotion analysis:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Backend APIを呼び出す
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';

    const response = await fetch(`${backendUrl}/api/emotion-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend API error' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error in emotion analysis POST:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}
