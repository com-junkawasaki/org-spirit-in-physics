import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const participantId = searchParams.get('participantId');

  try {
    // Backend APIを呼び出す
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
    const params = new URLSearchParams();
    params.append('type', type || '');
    if (participantId) params.append('participantId', participantId);

    const response = await fetch(`${backendUrl}/api/experimental-data?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend API error' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error fetching experimental data:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}
