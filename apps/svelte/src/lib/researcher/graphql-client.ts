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
		console.log('fetchTimeline: Requesting', { participantId, sessionId, startTime, endTime, interval });
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
		console.log('fetchTimeline: Response', JSON.stringify(data, null, 2));
		const result = data.timeline || [];
		console.log('fetchTimeline: Result count', result.length);
		
		// デバッグ: データの詳細を確認
		if (result.length > 0) {
			console.log('fetchTimeline: All items:', result.map(item => ({
				time: item.time,
				word: item.word,
				eventType: item.eventType,
				hasResponse: item.hasResponse,
				emotionsCount: item.emotions?.length || 0,
				participantId: item.participantId,
				sessionId: item.sessionId
			})));
			console.log('fetchTimeline: Time range:', {
				first: result[0]?.time,
				last: result[result.length - 1]?.time,
				total: result.length
			});
			console.log('fetchTimeline: Unique words:', [...new Set(result.map(item => item.word))]);
			console.log('fetchTimeline: Event types:', [...new Set(result.map(item => item.eventType))]);
		} else {
			console.warn('fetchTimeline: ⚠️ No data returned!');
			console.warn('fetchTimeline: Full response:', JSON.stringify(data, null, 2));
		}
		
		return result;
	} catch (error: any) {
		console.error('Error fetching timeline:', error);
		if (error.response) {
			console.error('GraphQL response error:', await error.response.text());
		}
		if (error.request) {
			console.error('GraphQL request:', error.request);
		}
		return [];
	}
}

export async function fetchWordAggregates(participantId: string, sessionId: string) {
	try {
		console.log('fetchWordAggregates: Requesting', { participantId, sessionId });
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
		console.log('fetchWordAggregates: Response', JSON.stringify(data, null, 2));
		const result = data.wordAggregates || [];
		console.log('fetchWordAggregates: Result count', result.length);
		
		// デバッグ: データの詳細を確認
		if (result.length > 0) {
			console.log('fetchWordAggregates: All items:', result.map(item => ({
				word: item.word,
				count: item.count,
				participantId: item.participantId,
				sessionId: item.sessionId
			})));
			console.log('fetchWordAggregates: All words:', result.map(item => item.word));
		} else {
			console.warn('fetchWordAggregates: ⚠️ No data returned!');
			console.warn('fetchWordAggregates: Full response:', JSON.stringify(data, null, 2));
		}
		
		return result;
	} catch (error: any) {
		console.error('Error fetching word aggregates:', error);
		if (error.response) {
			console.error('GraphQL response error:', await error.response.text());
		}
		if (error.request) {
			console.error('GraphQL request:', error.request);
		}
		return [];
	}
}

export async function fetchEmotionVectors(participantId: string, sessionId: string) {
	try {
		console.log('fetchEmotionVectors: Requesting', { participantId, sessionId });
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
		console.log('fetchEmotionVectors: Response', JSON.stringify(data, null, 2));
		const result = data.emotionVectors || [];
		console.log('fetchEmotionVectors: Result count', result.length);
		
		// デバッグ: データの詳細を確認
		if (result.length > 0) {
			console.log('fetchEmotionVectors: All items:', result.map(item => ({
				word: item.word,
				emotionEntryCount: item.emotionEntryCount,
				participantId: item.participantId,
				sessionId: item.sessionId,
				hasJoy: item.joySum > 0
			})));
			console.log('fetchEmotionVectors: All words:', result.map(item => item.word));
		} else {
			console.warn('fetchEmotionVectors: ⚠️ No data returned!');
			console.warn('fetchEmotionVectors: Full response:', JSON.stringify(data, null, 2));
		}
		
		return result;
	} catch (error: any) {
		console.error('Error fetching emotion vectors:', error);
		if (error.response) {
			console.error('GraphQL response error:', await error.response.text());
		}
		if (error.request) {
			console.error('GraphQL request:', error.request);
		}
		return [];
	}
}
