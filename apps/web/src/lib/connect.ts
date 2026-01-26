import { createConnectTransport } from "@connectrpc/connect-web";
// connect.ts - trigger tilt rebuild v2
import { createClient } from "@connectrpc/connect";
import { ParticipantService } from "@/generated/proto/participant/v1/participant_connect";
import { SessionService } from "@/generated/proto/session/v1/session_connect";
import { TimelineService } from "@/generated/proto/timeline/v1/timeline_connect";
import { StorageService } from "@/generated/proto/storage/v1/storage_connect";
import { PreferenceService } from "@/generated/proto/preference/v1/preference_connect";
import { PUBLIC_API_URL } from "$lib/env.svelte";

const transport = createConnectTransport({
	// In SPA mode, we typically use the relative path /api which is handled by Envoy/Gateway
	baseUrl: typeof window !== 'undefined' ? "/api" : (PUBLIC_API_URL || ""),
});

export const participantClient = createClient(ParticipantService, transport);
export const sessionClient = createClient(SessionService, transport);
export const timelineClient = createClient(TimelineService, transport);
export const storageClient = createClient(StorageService, transport);
export const preferenceClient = createClient(PreferenceService, transport);
