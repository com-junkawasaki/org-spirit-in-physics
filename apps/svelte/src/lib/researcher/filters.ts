// Filter utilities for researcher dashboard

export interface ParticipantFilter {
	ageMin?: number;
	ageMax?: number;
	gender?: string;
	handedness?: string;
	dateFrom?: string;
	dateTo?: string;
}

export interface SessionFilter {
	sessionIndex?: number;
	dateFrom?: string;
	dateTo?: string;
	minResponses?: number;
}

export interface DataFilter {
	word?: string;
	emotion?: string;
	minReactionValue?: number;
	maxReactionValue?: number;
	minReactionTime?: number;
	maxReactionTime?: number;
}

export function filterParticipants(
	participants: any[],
	filter: ParticipantFilter
): any[] {
	return participants.filter((p) => {
		if (filter.ageMin !== undefined && (p.age || 0) < filter.ageMin) return false;
		if (filter.ageMax !== undefined && (p.age || 0) > filter.ageMax) return false;
		if (filter.gender && p.gender !== filter.gender) return false;
		if (filter.handedness && p.handedness !== filter.handedness) return false;
		if (filter.dateFrom && p.createdAt < filter.dateFrom) return false;
		if (filter.dateTo && p.createdAt > filter.dateTo) return false;
		return true;
	});
}

export function filterSessions(sessions: any[], filter: SessionFilter): any[] {
	return sessions.filter((s) => {
		if (filter.sessionIndex !== undefined && s.sessionIndex !== filter.sessionIndex) return false;
		if (filter.dateFrom && s.startTs < filter.dateFrom) return false;
		if (filter.dateTo && s.startTs > filter.dateTo) return false;
		if (filter.minResponses !== undefined) {
			const responseCount = s.events?.filter((e: any) => e.type === 'word_response').length || 0;
			if (responseCount < filter.minResponses) return false;
		}
		return true;
	});
}

export function filterTimelineData(timelineData: any[], filter: DataFilter): any[] {
	return timelineData.filter((point) => {
		if (filter.word && point.word !== filter.word) return false;
		if (filter.emotion) {
			const hasEmotion = point.emotions?.some((e: any) => e.name === filter.emotion);
			if (!hasEmotion) return false;
		}
		if (filter.minReactionValue !== undefined && (point.reactionValue || 0) < filter.minReactionValue)
			return false;
		if (filter.maxReactionValue !== undefined && (point.reactionValue || 0) > filter.maxReactionValue)
			return false;
		if (filter.minReactionTime !== undefined && (point.reactionTime || 0) < filter.minReactionTime)
			return false;
		if (filter.maxReactionTime !== undefined && (point.reactionTime || 0) > filter.maxReactionTime)
			return false;
		return true;
	});
}
