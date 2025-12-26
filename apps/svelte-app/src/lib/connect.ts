import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { ParticipantService } from "@/generated/proto/participant/v1/participant_connect";
import { SessionService } from "@/generated/proto/session/v1/session_connect";
import { TimelineService } from "@/generated/proto/timeline/v1/timeline_connect";
import { StorageService } from "@/generated/proto/storage/v1/storage_connect";
import { PUBLIC_API_URL } from "$lib/env";

// In CSR mode, we use relative URL or env var
const baseUrl = PUBLIC_API_URL || "";

const transport = createConnectTransport({
	baseUrl,
});

export const participantClient = createClient(ParticipantService, transport);
export const sessionClient = createClient(SessionService, transport);
export const timelineClient = createClient(TimelineService, transport);
export const storageClient = createClient(StorageService, transport);
