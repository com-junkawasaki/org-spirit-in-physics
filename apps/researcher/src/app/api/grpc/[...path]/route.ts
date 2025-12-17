// Merkle DAG: api.grpc.proxy
// Connect RPC API proxy endpoint for client-side requests
// This allows browser to make Connect RPC requests through Next.js API route
// avoiding CORS issues

import { NextRequest, NextResponse } from 'next/server';
import { createConnectTransport } from '@connectrpc/connect-node';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get gRPC API URL (server-side)
    const grpcUrl = process.env.GRPC_API_URL || 'http://localhost:8080';
    
    // Get Supabase session token
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || null;
    
    // Get the request body
    const body = await request.arrayBuffer();
    
    // Get the path from params
    const path = params.path.join('/');
    const fullPath = `/${path}`;
    
    // Create Connect transport for Node.js
    const transport = createConnectTransport({
      baseUrl: grpcUrl,
      httpVersion: '2',
    });
    
    // Forward the Connect RPC request to the gRPC service
    const headers: HeadersInit = {
      'Content-Type': 'application/connect+json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Forward the request
    const response = await fetch(`${grpcUrl}${fullPath}`, {
      method: 'POST',
      headers,
      body: new Uint8Array(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Connect Proxy] HTTP error:', response.status, errorText);
      return NextResponse.json(
        { 
          code: response.status,
          message: `Connect RPC request failed: ${response.statusText}`,
        },
        { status: response.status }
      );
    }
    
    const data = await response.arrayBuffer();
    return new NextResponse(data, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/connect+json',
      },
    });
  } catch (error: any) {
    console.error('[Connect Proxy] Error:', error);
    return NextResponse.json(
      { 
        code: 500,
        message: error.message || 'Connect RPC request failed',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Connect RPC endpoint - use POST for RPC calls' });
}
