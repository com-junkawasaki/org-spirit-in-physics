// Merkle DAG: connect.server-client
// Connect RPC client for server-side usage
// Uses Connect-Node for server-side communication

import { createPromiseClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-node';
// Generated types from protobuf
import { ParticipantService } from '@/generated/proto/participant/v1/participant_connect';
import { SessionService } from '@/generated/proto/session/v1/session_connect';
import { TimelineService } from '@/generated/proto/timeline/v1/timeline_connect';

// Get Connect API URL for server-side
function getServerConnectApiUrl(): string {
  const serverUrl = process.env.GRPC_API_URL;
  if (serverUrl) {
    return serverUrl;
  }
  // Fallback for local development
  return 'http://localhost:8080';
}

// Create Connect transport for server-side
function createServerConnectTransport() {
  const url = getServerConnectApiUrl();
  
  // Log the Connect API URL for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Connect Server Client] Using API URL:', url);
  }
  
  return createConnectTransport({
    baseUrl: url,
    // Use Node.js fetch
    fetch: globalThis.fetch,
    // Use JSON format for server-side
    useBinaryFormat: false,
  });
}

// Create Connect clients for server-side
const serverTransport = createServerConnectTransport();

export const serverParticipantClient = createPromiseClient(
  ParticipantService,
  serverTransport
);

export const serverSessionClient = createPromiseClient(
  SessionService,
  serverTransport
);

export const serverTimelineClient = createPromiseClient(
  TimelineService,
  serverTransport
);

// Export transport for custom clients
export { serverTransport };
