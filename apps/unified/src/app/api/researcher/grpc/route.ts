import { NextRequest, NextResponse } from 'next/server';

// Merkle DAG: unified.app.researcher.api.grpc
// Next.js API proxy route for gRPC-Web / Connect protocol requests

export async function GET(request: NextRequest) {
  return handleGrpcRequest(request);
}

export async function POST(request: NextRequest) {
  return handleGrpcRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleGrpcRequest(request);
}

export async function OPTIONS(request: NextRequest) {
  return handleGrpcRequest(request);
}

async function handleGrpcRequest(request: NextRequest) {
  // Get gRPC service URL
  const grpcUrl = process.env.GRPC_API_URL || "http://grpc-service:8083";
  
  // Get the service and method from the path
  // Connect protocol uses paths like: /spirit_in_physics.participants.v1.ParticipantService/GetParticipants
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/researcher/grpc", "");
  
  // Forward the request to the gRPC service
  try {
    const body = request.method !== "GET" && request.method !== "HEAD" 
      ? await request.text() 
      : null;

    const response = await fetch(`${grpcUrl}${path}`, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: body ?? null,
    });

    // Set CORS headers
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handle OPTIONS request
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 200, headers });
    }

    // Forward response body
    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers
    });
  } catch (error) {
    console.error("gRPC proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
