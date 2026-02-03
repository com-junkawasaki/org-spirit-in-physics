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
	// Use PUBLIC_API_URL for local development (http://localhost:8080)
	// In production, this would be https://spirit-in-physics.com/api or similar
	baseUrl: PUBLIC_API_URL || "/api",
});

export const participantClient = createClient(ParticipantService, transport);
export const sessionClient = createClient(SessionService, transport);
export const timelineClient = createClient(TimelineService, transport);
export const storageClient = createClient(StorageService, transport);
export const preferenceClient = createClient(PreferenceService, transport);
