import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { runtimeConfig } from "$lib/env.svelte";

// Import proto services from local generated files
import { ParticipantService } from "@/generated/proto/participant/v1/participant_connect";
import { SessionService } from "@/generated/proto/session/v1/session_connect";
import { TimelineService } from "@/generated/proto/timeline/v1/timeline_connect";
import { StorageService } from "@/generated/proto/storage/v1/storage_connect";
import { PreferenceService } from "@/generated/proto/preference/v1/preference_connect";
import { ImportService } from "@/generated/proto/import/v1/import_connect";

/**
 * Get default base URL based on environment
 */
function getDefaultBaseUrl(): string {
  const { PUBLIC_API_URL, IS_CAPACITOR } = runtimeConfig;

  // Browser environment
  if (typeof window !== 'undefined') {
    // Capacitor iOS Simulator uses localhost
    if (IS_CAPACITOR) {
      return "http://localhost:8080";
    }
    // SPA mode uses relative path handled by Envoy/Gateway
    return "/api";
  }
  // Server-side or fallback
  return PUBLIC_API_URL || "https://spirit-in-physics.com/api";
}

const baseUrl = getDefaultBaseUrl();
const transport = createConnectTransport({ baseUrl });

export const participantClient = createClient(ParticipantService, transport);
export const sessionClient = createClient(SessionService, transport);
export const timelineClient = createClient(TimelineService, transport);
export const storageClient = createClient(StorageService, transport);
export const preferenceClient = createClient(PreferenceService, transport);
export const importClient = createClient(ImportService, transport);
