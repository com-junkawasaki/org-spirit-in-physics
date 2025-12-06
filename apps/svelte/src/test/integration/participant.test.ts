import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStimulusWords } from '$lib/jung-voice-assessment/hooks/useStimulusWords';
import { useSaveSession } from '$lib/jung-voice-assessment/hooks/useSaveSession';
import { kawasakiStore } from '$lib/jung-voice-assessment/store';

// Mock fetch
global.fetch = vi.fn();

describe('Participant Integration Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		kawasakiStore.resetTest();
	});

	it('fetches stimulus words', async () => {
		const mockWords = [
			{ id: '1', japanese: '頭', english: 'head', pronunciation: 'あたま' }
		];

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: { stimulusWords: mockWords }
			})
		});

		const result = await useStimulusWords();
		expect(result.words.length).toBeGreaterThan(0);
	});

	it('saves session data', async () => {
		kawasakiStore.initializeParticipant();
		kawasakiStore.startSession(10);

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: { saveSession: { id: 'session1' } }
			})
		});

		const result = await useSaveSession();
		expect(result.success).toBe(true);
	});

	it('handles save errors', async () => {
		kawasakiStore.initializeParticipant();

		(global.fetch as any).mockRejectedValueOnce(new Error('Save failed'));

		const result = await useSaveSession();
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});
