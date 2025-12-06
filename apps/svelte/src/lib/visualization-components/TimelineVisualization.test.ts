import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TimelineVisualization from './TimelineVisualization.svelte';
import type { TimelinePoint } from './types';

describe('TimelineVisualization', () => {
	const mockTimelinePoints: TimelinePoint[] = [
		{
			time: '2024-01-01T00:00:00Z',
			participantId: 'test-participant',
			sessionId: 'test-session',
			word: 'test',
			eventType: 'word_response',
			reactionValue: 50,
			reactionTime: 1000,
			hasResponse: true,
			emotions: [
				{ name: 'joy', score: 0.8, fileType: 'audio' }
			],
			physiological: [],
			metadata: {}
		},
		{
			time: '2024-01-01T00:01:00Z',
			participantId: 'test-participant',
			sessionId: 'test-session',
			word: 'test2',
			eventType: 'word_response',
			reactionValue: 60,
			reactionTime: 1200,
			hasResponse: true,
			emotions: [
				{ name: 'sadness', score: 0.3, fileType: 'audio' }
			],
			physiological: [],
			metadata: {}
		}
	];

	it('renders timeline visualization', () => {
		render(TimelineVisualization, {
			timelinePoints: mockTimelinePoints,
			participantId: 'test-participant',
			sessionId: 'test-session'
		});

		expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
	});

	it('shows message when no data', () => {
		render(TimelineVisualization, {
			timelinePoints: [],
			participantId: 'test-participant',
			sessionId: 'test-session'
		});

		expect(screen.getByText('タイムラインデータがありません')).toBeInTheDocument();
	});
});
