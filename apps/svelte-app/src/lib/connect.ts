import { createConnectTransport as createWebTransport } from "@connectrpc/connect-web";
import { createClient, type Transport } from "@connectrpc/connect";
import { ParticipantService } from "@/generated/proto/participant/v1/participant_connect";
import { SessionService } from "@/generated/proto/session/v1/session_connect";
import { TimelineService } from "@/generated/proto/timeline/v1/timeline_connect";
import { StorageService } from "@/generated/proto/storage/v1/storage_connect";
import { PUBLIC_API_URL } from "$lib/env";

const isBrowser = typeof window !== 'undefined';

let transport: Transport;

if (isBrowser) {
	transport = createWebTransport({
		baseUrl: "/api",
	});
} else {
	// Dynamically import connect-node only on server to avoid bundling it for the browser
	const { createConnectTransport: createNodeTransport } = await import("@connectrpc/connect-node");
	transport = createNodeTransport({
		baseUrl: PUBLIC_API_URL || "http://grpc-service:8080",
		httpVersion: "1.1",
	});
}

export const participantClient = createClient(ParticipantService, transport);
export const sessionClient = createClient(SessionService, transport);
export const timelineClient = createClient(TimelineService, transport);
export const storageClient = createClient(StorageService, transport);
