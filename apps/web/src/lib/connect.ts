import { runtimeConfig } from "$lib/env.svelte";

function getApiBaseUrl(): string {
  const { PUBLIC_API_URL, IS_CAPACITOR } = runtimeConfig;
  if (typeof window !== "undefined" && IS_CAPACITOR) {
    return "http://localhost:8080/api";
  }
  return PUBLIC_API_URL || "/api";
}

async function fetchJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || body?.error || `Request failed: ${response.status}`);
  }
  return body as T;
}

function buildTimelineQuery(payload: { participantId: string; sessionId?: string }): string {
  const params = new URLSearchParams({ participantId: payload.participantId });
  if (payload.sessionId) {
    params.set("sessionId", payload.sessionId);
  }
  return `?${params.toString()}`;
}

export const participantClient = {
  async getParticipants(_: Record<string, never>): Promise<any> {
    return fetchJson("/participants");
  },
  async getParticipantByEmail({ email }: { email: string }): Promise<any> {
    return fetchJson(
      `/participants/by-email?email=${encodeURIComponent(email)}`,
    );
  },
  async createParticipant(payload: Record<string, unknown>): Promise<any> {
    return fetchJson("/participants", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async getStimulusWords(_: Record<string, never>): Promise<any> {
    return fetchJson("/stimulus-words");
  },
  async startAssessment(payload: Record<string, unknown>): Promise<any> {
    return fetchJson("/assessments/start", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async signalStartSession(payload: Record<string, unknown>): Promise<any> {
    return fetchJson("/assessments/session-start", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async signalWordResponse(payload: Record<string, unknown>): Promise<any> {
    return fetchJson("/assessments/word-response", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async signalArtifact(payload: Record<string, unknown>): Promise<any> {
    return fetchJson("/assessments/artifact", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async completeAssessment(payload: Record<string, unknown>): Promise<any> {
    return fetchJson("/assessments/complete", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const sessionClient = {
  async getSessions(payload: { participantId?: string } = {}): Promise<any> {
    const query = payload.participantId
      ? `?participantId=${encodeURIComponent(payload.participantId)}`
      : "";
    return fetchJson(`/sessions${query}`);
  },
};

export const timelineClient = {
  async getIntegratedTimeline(
    payload: { participantId: string; sessionId?: string },
    init?: RequestInit,
  ): Promise<any> {
    return fetchJson(`/timeline/integrated${buildTimelineQuery(payload)}`, init);
  },
  async getEmotionVectors(
    payload: { participantId: string; sessionId?: string },
    init?: RequestInit,
  ): Promise<any> {
    return fetchJson(`/timeline/emotion-vectors${buildTimelineQuery(payload)}`, init);
  },
  async getAnalysis(
    payload: { participantId: string; sessionId?: string },
    init?: RequestInit,
  ): Promise<any> {
    return fetchJson(`/timeline/analysis${buildTimelineQuery(payload)}`, init);
  },
  async getWordStatistics(
    payload: { participantId: string; sessionId?: string },
    init?: RequestInit,
  ): Promise<any> {
    return fetchJson(`/timeline/word-statistics${buildTimelineQuery(payload)}`, init);
  },
  async getWordAggregates(
    payload: { participantId: string; sessionId?: string },
    init?: RequestInit,
  ): Promise<any> {
    return fetchJson(`/timeline/word-aggregates${buildTimelineQuery(payload)}`, init);
  },
};

export const storageClient = {
  async uploadArtifact(payload: {
    participantId: string;
    fileName: string;
    fileData: Uint8Array;
    contentType: string;
    artifactType: string;
    sessionIndex?: number;
  }): Promise<any> {
    const binary = payload.fileData;
    let base64 = "";
    for (let i = 0; i < binary.length; i += 0x8000) {
      const chunk = binary.subarray(i, i + 0x8000);
      base64 += String.fromCharCode(...chunk);
    }
    return fetchJson("/storage/upload", {
      method: "POST",
      body: JSON.stringify({
        participantId: payload.participantId,
        fileName: payload.fileName,
        fileDataBase64: btoa(base64),
        contentType: payload.contentType,
        artifactType: payload.artifactType,
        sessionIndex: payload.sessionIndex,
      }),
    });
  },
};

export const preferenceClient = {
  async getPreference(_: { userId: string }): Promise<any> {
    return { preference: { theme: "system" } };
  },
  async updatePreference(_: Record<string, unknown>): Promise<any> {
    return { success: true };
  },
};

export const importClient = {
  async importParticipants(..._: any[]): Promise<any> {
    throw new Error("Cloudflare Worker import API is not implemented yet.");
  },
};
