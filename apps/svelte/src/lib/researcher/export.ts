// Export utilities for researcher dashboard

export interface ExportOptions {
	format: 'csv' | 'json';
	includeEmotions?: boolean;
	includePhysiological?: boolean;
	includeMetadata?: boolean;
}

export function exportToCSV(data: any[], filename: string = 'export.csv'): void {
	if (data.length === 0) {
		console.warn('No data to export');
		return;
	}

	const headers = Object.keys(data[0]);
	const csvRows = [headers.join(',')];

	for (const row of data) {
		const values = headers.map((header) => {
			const value = row[header];
			if (value === null || value === undefined) return '';
			if (typeof value === 'object') return JSON.stringify(value);
			return String(value).replace(/"/g, '""');
		});
		csvRows.push(values.map((v) => `"${v}"`).join(','));
	}

	const csvContent = csvRows.join('\n');
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

export function exportToJSON(data: any[], filename: string = 'export.json'): void {
	const jsonContent = JSON.stringify(data, null, 2);
	const blob = new Blob([jsonContent], { type: 'application/json' });
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

export function exportParticipants(
	participants: any[],
	options: ExportOptions = { format: 'csv' }
): void {
	const data = participants.map((p) => ({
		id: p.id,
		age: p.age || '',
		gender: p.gender || '',
		handedness: p.handedness || '',
		createdAt: p.createdAt || '',
		updatedAt: p.updatedAt || ''
	}));

	const filename = `participants_${new Date().toISOString().split('T')[0]}.${options.format}`;
	if (options.format === 'csv') {
		exportToCSV(data, filename);
	} else {
		exportToJSON(data, filename);
	}
}

export function exportSessions(
	sessions: any[],
	options: ExportOptions = { format: 'csv' }
): void {
	const data = sessions.map((s) => ({
		id: s.id,
		participantId: s.participantId,
		sessionIndex: s.sessionIndex || '',
		startTs: s.startTs || '',
		endTs: s.endTs || '',
		eventCount: s.events?.length || 0,
		createdAt: s.createdAt || '',
		updatedAt: s.updatedAt || ''
	}));

	const filename = `sessions_${new Date().toISOString().split('T')[0]}.${options.format}`;
	if (options.format === 'csv') {
		exportToCSV(data, filename);
	} else {
		exportToJSON(data, filename);
	}
}

export function exportTimelineData(
	timelineData: any[],
	options: ExportOptions = { format: 'csv', includeEmotions: true, includePhysiological: true }
): void {
	const data = timelineData.map((point) => {
		const row: any = {
			time: point.time,
			participantId: point.participantId,
			sessionId: point.sessionId,
			word: point.word || '',
			eventType: point.eventType || '',
			reactionValue: point.reactionValue || '',
			reactionTime: point.reactionTime || '',
			hasResponse: point.hasResponse
		};

		if (options.includeEmotions && point.emotions) {
			point.emotions.forEach((e: any, i: number) => {
				row[`emotion_${i}_name`] = e.name;
				row[`emotion_${i}_score`] = e.score;
			});
		}

		if (options.includePhysiological && point.physiological) {
			point.physiological.forEach((p: any, i: number) => {
				row[`physiological_${i}_timestamp`] = p.timestamp;
				row[`physiological_${i}_value`] = p.value;
			});
		}

		if (options.includeMetadata && point.metadata) {
			Object.keys(point.metadata).forEach((key) => {
				row[`metadata_${key}`] = point.metadata[key];
			});
		}

		return row;
	});

	const filename = `timeline_${new Date().toISOString().split('T')[0]}.${options.format}`;
	if (options.format === 'csv') {
		exportToCSV(data, filename);
	} else {
		exportToJSON(data, filename);
	}
}

export function exportWordAggregates(
	wordAggregates: any[],
	options: ExportOptions = { format: 'csv' }
): void {
	const filename = `word_aggregates_${new Date().toISOString().split('T')[0]}.${options.format}`;
	if (options.format === 'csv') {
		exportToCSV(wordAggregates, filename);
	} else {
		exportToJSON(wordAggregates, filename);
	}
}

export function exportEmotionVectors(
	emotionVectors: any[],
	options: ExportOptions = { format: 'csv' }
): void {
	const filename = `emotion_vectors_${new Date().toISOString().split('T')[0]}.${options.format}`;
	if (options.format === 'csv') {
		exportToCSV(emotionVectors, filename);
	} else {
		exportToJSON(emotionVectors, filename);
	}
}
