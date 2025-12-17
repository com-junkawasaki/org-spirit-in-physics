// Merkle DAG: connect.client
// Connect RPC client for connecting to gRPC service
// Uses Connect-Web for browser compatibility

import { createPromiseClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
// Generated types from protobuf
import { ParticipantService } from '@/generated/proto/participant/v1/participant_connect';
import { SessionService } from '@/generated/proto/session/v1/session_connect';
import { TimelineService } from '@/generated/proto/timeline/v1/timeline_connect';

// Determine Connect API URL based on execution context
// Server-side: Use GRPC_API_URL (for Docker internal communication)
// Client-side: Use NEXT_PUBLIC_GRPC_API_URL (for browser access)
// Fallback: localhost for local development
export function getConnectApiUrl(): string {
  // Server-side (Node.js environment)
  if (typeof window === 'undefined') {
    const serverUrl = process.env.GRPC_API_URL;
    if (serverUrl) {
      return serverUrl;
    }
    // Fallback for server-side local development
    return 'http://localhost:8080';
  }
  
  // Client-side (browser environment)
  // Use Next.js API route as proxy to avoid CORS issues
  const clientUrl = process.env.NEXT_PUBLIC_GRPC_API_URL;
  if (clientUrl) {
    return clientUrl;
  }
  return '/api/grpc';
}

// Create Connect transport
export function createConnectTransportInstance() {
  const url = getConnectApiUrl();
  
  // Log the Connect API URL for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Connect Client] Using API URL:', url);
    console.log('[Connect Client] Environment:', typeof window === 'undefined' ? 'server-side' : 'client-side');
  }
  
  return createConnectTransport({
    baseUrl: url,
    // Use fetch API for both browser and Node.js
    fetch: typeof window !== 'undefined' ? window.fetch : globalThis.fetch,
    // Enable gRPC-Web for browser compatibility
    useBinaryFormat: false,
  });
}

// Create Connect clients
const transport = createConnectTransportInstance();

export const participantClient = createPromiseClient(
  ParticipantService,
  transport
);

export const sessionClient = createPromiseClient(
  SessionService,
  transport
);

export const timelineClient = createPromiseClient(
  TimelineService,
  transport
);

// Export transport for custom clients
export { transport };
