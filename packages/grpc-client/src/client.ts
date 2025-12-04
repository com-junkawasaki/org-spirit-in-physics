// Merkle DAG: grpc.client
// Connect protocol client factory

import { createClient, type Client } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

// Determine gRPC API URL based on execution context
// Server-side: Use GRPC_API_URL (for Docker internal communication)
// Client-side: Use NEXT_PUBLIC_GRPC_API_URL (for browser access)
// Fallback: localhost for local development
export function getGrpcApiUrl(): string {
  // Server-side (Node.js environment)
  if (typeof window === "undefined") {
    const serverUrl = process.env.GRPC_API_URL;
    if (serverUrl) {
      return serverUrl;
    }
    // Fallback: use production URL in production, localhost in development
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      return "https://grpc.sip.junkawasaki.com";
    }
    // Fallback for server-side local development
    return "http://localhost:8083";
  }
  
  // Client-side (browser environment)
  // Use Next.js API route as proxy to avoid CORS and mixed content issues
  return "/api/grpc";
}

// Create a Connect transport
export function createGrpcTransport(baseUrl?: string) {
  const url = baseUrl || getGrpcApiUrl();
  
  if (process.env.NODE_ENV === "development") {
    console.log("[gRPC Client] Using API URL:", url);
    console.log("[gRPC Client] Environment:", typeof window === "undefined" ? "server-side" : "client-side");
  }
  
  return createConnectTransport({
    baseUrl: url,
    // Use fetch API (works in both browser and Node.js)
    fetch: typeof window !== "undefined" ? window.fetch : globalThis.fetch,
    // Enable credentials for authentication
    useBinaryFormat: true,
  });
}

// Create a client for a service
export function createGrpcClient<T extends Client<any>>(
  Service: any,
  baseUrl?: string
): T {
  const transport = createGrpcTransport(baseUrl);
  return createClient(Service, transport) as T;
}

