import { client } from '$lib/graphql/client';
import { gql } from 'graphql-request';
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
		const data = await client.request<{ participants: any[] }>(gql`
			query GetParticipants {
				participants {
					id
					age
					gender
					handedness
					createdAt
					updatedAt
				}
			}
		`);
		console.log('Fetched participants:', JSON.stringify(data, null, 2));
		return data.participants || [];
	} catch (error: any) {
		console.error('Error fetching participants:', error);
		if (error.response) {
			console.error('GraphQL response error:', await error.response.text());
		}
		if (error.request) {
			console.error('GraphQL request:', error.request);
		}
		return [];
	}
}

export async function fetchParticipant(id: string) {
	try {
		const data = await client.request<{ participant: any }>(
			gql`
				query GetParticipant($id: ID!) {
					participant(id: $id) {
						id
						age
						gender
						handedness
						createdAt
						updatedAt
					}
				}
			`,
			{ id }
		);
		return data.participant || null;
	} catch (error) {
		console.error('Error fetching participant:', error);
		return null;
	}
}

export async function fetchSessions(participantId: string) {
	try {
		const data = await client.request<{ sessions: any[] }>(
			gql`
				query GetSessions($participantId: ID!) {
					sessions(participantId: $participantId) {
						id
						participantId
						sessionIndex
						startTs
						endTs
						events
						createdAt
						updatedAt
					}
				}
			`,
			{ participantId }
		);
		return data.sessions || [];
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
		const data = await client.request<{ timeline: any[] }>(
			gql`
				query GetTimeline($participantId: ID!, $sessionId: ID, $startTime: String, $endTime: String, $interval: String) {
					timeline(participantId: $participantId, sessionId: $sessionId, startTime: $startTime, endTime: $endTime, interval: $interval) {
						time
						participantId
						sessionId
						word
						eventType
						reactionValue
						reactionTime
						hasResponse
						emotions {
							name
							score
							fileType
							color
						}
						physiological {
							timestamp
							value
							metadata
						}
						metadata
					}
				}
			`,
			{ participantId, sessionId, startTime, endTime, interval }
		);
		return data.timeline || [];
	} catch (error) {
		console.error('Error fetching timeline:', error);
		return [];
	}
}

export async function fetchWordAggregates(participantId: string, sessionId: string) {
	try {
		const data = await client.request<{ wordAggregates: any[] }>(
			gql`
				query GetWordAggregates($participantId: ID!, $sessionId: ID!) {
					wordAggregates(participantId: $participantId, sessionId: $sessionId) {
						participantId
						sessionId
						word
						count
						avgReactionValue
						sumReactionValue
						avgReactionTime
						sumReactionTime
						avgPhysiological
						sumPhysAbs
						physSeries
						rtSeries
						rvSeries
						firstTime
						lastTime
					}
				}
			`,
			{ participantId, sessionId }
		);
		return data.wordAggregates || [];
	} catch (error) {
		console.error('Error fetching word aggregates:', error);
		return [];
	}
}

export async function fetchEmotionVectors(participantId: string, sessionId: string) {
	try {
		const data = await client.request<{ emotionVectors: any[] }>(
			gql`
				query GetEmotionVectors($participantId: ID!, $sessionId: ID!) {
					emotionVectors(participantId: $participantId, sessionId: $sessionId) {
						participantId
						sessionId
						word
						joySum
						sadnessSum
						angerSum
						fearSum
						surpriseSum
						disgustSum
						calmSum
						focusSum
						excitementSum
						confusionSum
						emotionEntryCount
						emotionByModality
					}
				}
			`,
			{ participantId, sessionId }
		);
		return data.emotionVectors || [];
	} catch (error) {
		console.error('Error fetching emotion vectors:', error);
		return [];
	}
}
