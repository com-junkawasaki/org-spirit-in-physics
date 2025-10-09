// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("Starting emotion analysis data import via backend...");

    // Backend APIを呼び出す
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';

    const response = await fetch(`${backendUrl}/api/admin/import/emotions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend API error' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Emotion import error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      results: []
    }, { status: 500 });
  }
}
