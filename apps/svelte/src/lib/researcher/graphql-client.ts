import { client } from '$lib/graphql/client';
import {
	PARTICIPANTS_QUERY,
	PARTICIPANT_QUERY,
	SESSIONS_QUERY,
	TIMELINE_QUERY,
	WORD_AGGREGATES_QUERY,
	EMOTION_VECTORS_QUERY
} from './queries';

export async function fetchParticipants() {
	try {
		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: PARTICIPANTS_QUERY })
		});
		const result = await response.json();
		return result.data?.participants || [];
	} catch (error) {
		console.error('Error fetching participants:', error);
		return [];
	}
}

export async function fetchParticipant(id: string) {
	try {
		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: PARTICIPANT_QUERY,
				variables: { id }
			})
		});
		const result = await response.json();
		return result.data?.participant || null;
	} catch (error) {
		console.error('Error fetching participant:', error);
		return null;
	}
}

export async function fetchSessions(participantId: string) {
	try {
		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: SESSIONS_QUERY,
				variables: { participantId }
			})
		});
		const result = await response.json();
		return result.data?.sessions || [];
	} catch (error) {
		console.error('Error fetching sessions:', error);
		return [];
	}
}

export async function fetchTimeline(
	participantId: string,
	sessionId?: string,
	startTime?: string,
	endTime?: string,
	interval?: string
) {
	try {
		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: TIMELINE_QUERY,
				variables: { participantId, sessionId, startTime, endTime, interval }
			})
		});
		const result = await response.json();
		return result.data?.timeline || [];
	} catch (error) {
		console.error('Error fetching timeline:', error);
		return [];
	}
}

export async function fetchWordAggregates(participantId: string, sessionId: string) {
	try {
		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: WORD_AGGREGATES_QUERY,
				variables: { participantId, sessionId }
			})
		});
		const result = await response.json();
		return result.data?.wordAggregates || [];
	} catch (error) {
		console.error('Error fetching word aggregates:', error);
		return [];
	}
}

export async function fetchEmotionVectors(participantId: string, sessionId: string) {
	try {
		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: EMOTION_VECTORS_QUERY,
				variables: { participantId, sessionId }
			})
		});
		const result = await response.json();
		return result.data?.emotionVectors || [];
	} catch (error) {
		console.error('Error fetching emotion vectors:', error);
		return [];
	}
}
