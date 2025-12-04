// Merkle DAG: unified.app.researcher.api.grpc
// Astro API proxy route for gRPC-Web / Connect protocol requests

import type { APIRoute } from 'astro'

export const ALL: APIRoute = async ({ request }) => {
  // Get gRPC service URL
  const grpcUrl = process.env.GRPC_API_URL || "http://grpc-service:8083";
  
  // Get the service and method from the path
  // Connect protocol uses paths like: /spirit_in_physics.participants.v1.ParticipantService/GetParticipants
  const url = new URL(request.url)
  const path = url.pathname.replace("/researcher/api/grpc", "");
  
  // Forward the request to the gRPC service
  try {
    const body = request.method !== "GET" && request.method !== "HEAD" 
      ? await request.text() 
      : null

    const response = await fetch(`${grpcUrl}${path}`, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body
    });

    // Set CORS headers
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handle OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers });
    }

    // Forward response body
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers
    });
  } catch (error) {
    console.error("gRPC proxy error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

