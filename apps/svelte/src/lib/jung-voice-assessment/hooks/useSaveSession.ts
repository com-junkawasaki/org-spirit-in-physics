import { kawasakiStore } from '../store';
import { get } from 'svelte/store';

interface SaveSessionData {
	participantId: string;
	sessionIndex: number;
	startTs: number;
	events: Array<{
		timestamp: number;
		type: string;
		payload?: any;
	}>;
}

export async function useSaveSession(
	callbacks?: {
		onSaveSession?: (data: SaveSessionData) => Promise<void>;
	}
): Promise<{ success: boolean; error?: string }> {
	const state = get(kawasakiStore);

	if (!state.participantId) {
		return { success: false, error: 'Participant ID is not set' };
	}

	try {
		const sessionStartedEvent = state.events.find((e) => e.type === 'session_started');
		const startTs = sessionStartedEvent?.timestamp || Date.now();
		const sessionIndex = state.currentSession || (sessionStartedEvent?.payload?.session as number | undefined) || 1;

		const sessionData: SaveSessionData = {
			participantId: state.participantId,
			sessionIndex,
			startTs,
			events: state.events
		};

		if (callbacks?.onSaveSession) {
			await callbacks.onSaveSession(sessionData);
		} else {
			// Default: save via GraphQL mutation
			await saveSessionViaGraphQL(sessionData);
		}

		kawasakiStore.logEvent('session_data_saved');
		return { success: true };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		kawasakiStore.setError(`セッションデータの保存に失敗しました: ${errorMessage}`);
		return { success: false, error: errorMessage };
	}
}

async function saveSessionViaGraphQL(data: SaveSessionData): Promise<void> {
	const mutation = `
		mutation SaveSession($participantId: ID!, $sessionIndex: Int!, $startTs: Int!, $events: [JSON!]!) {
			saveSession(participantId: $participantId, sessionIndex: $sessionIndex, startTs: $startTs, events: $events) {
				id
			}
		}
	`;

	const response = await fetch('/api/graphql', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: mutation,
			variables: {
				participantId: data.participantId,
				sessionIndex: data.sessionIndex,
				startTs: data.startTs,
				events: data.events
			}
		})
	});

	if (!response.ok) {
		throw new Error(`GraphQL request failed: ${response.statusText}`);
	}

	const result = await response.json();
	if (result.errors) {
		throw new Error(result.errors[0]?.message || 'GraphQL error');
	}
}
