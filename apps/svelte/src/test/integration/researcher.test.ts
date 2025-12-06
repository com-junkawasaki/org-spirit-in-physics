import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { fetchParticipants, fetchSessions, fetchWordAggregates } from '$lib/researcher/graphql-client';

// Mock fetch
global.fetch = vi.fn();

describe('Researcher Integration Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches participants', async () => {
		const mockParticipants = [
			{ id: '1', age: 25, gender: 'male', handedness: 'right' }
		];

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: { participants: mockParticipants }
			})
		});

		const participants = await fetchParticipants();
		expect(participants).toEqual(mockParticipants);
		expect(global.fetch).toHaveBeenCalledWith(
			'/api/graphql',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			})
		);
	});

	it('fetches sessions for participant', async () => {
		const mockSessions = [
			{ id: 'session1', participantId: '1', sessionIndex: 1 }
		];

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: { sessions: mockSessions }
			})
		});

		const sessions = await fetchSessions('1');
		expect(sessions).toEqual(mockSessions);
	});

	it('fetches word aggregates', async () => {
		const mockAggregates = [
			{
				participantId: '1',
				sessionId: 'session1',
				word: 'test',
				count: 5
			}
		];

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: { wordAggregates: mockAggregates }
			})
		});

		const aggregates = await fetchWordAggregates('1', 'session1');
		expect(aggregates).toEqual(mockAggregates);
	});

	it('handles fetch errors gracefully', async () => {
		(global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

		const participants = await fetchParticipants();
		expect(participants).toEqual([]);
	});
});
