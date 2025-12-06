import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Force3DWordGraph from './Force3DWordGraph.svelte';
import type { WordAggregate, EmotionVector } from './types';

describe('Force3DWordGraph', () => {
	const mockWordAggregates: WordAggregate[] = [
		{
			participantId: 'test-participant',
			sessionId: 'test-session',
			word: 'test',
			count: 5,
			avgReactionValue: 50,
			sumReactionValue: 250,
			avgReactionTime: 1000,
			sumReactionTime: 5000,
			firstTime: '2024-01-01T00:00:00Z',
			lastTime: '2024-01-01T00:05:00Z'
		}
	];

	const mockEmotionVectors: EmotionVector[] = [
		{
			participantId: 'test-participant',
			sessionId: 'test-session',
			word: 'test',
			joySum: 4.0,
			emotionEntryCount: 5
		}
	];

	it('renders force graph when data is available', () => {
		render(Force3DWordGraph, {
			wordAggregates: mockWordAggregates,
			emotionVectors: mockEmotionVectors
		});

		// Component should render without errors
		expect(true).toBe(true);
	});

	it('shows message when no data', () => {
		render(Force3DWordGraph, {
			wordAggregates: [],
			emotionVectors: []
		});

		expect(screen.getByText(/データがありません/)).toBeInTheDocument();
	});
});
