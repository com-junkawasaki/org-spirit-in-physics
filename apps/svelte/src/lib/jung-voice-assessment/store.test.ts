import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { kawasakiStore } from './store';
import type { Word } from './types';

describe('KawasakiStore', () => {
	beforeEach(() => {
		kawasakiStore.resetTest();
	});

	it('initializes with correct default state', () => {
		const state = get(kawasakiStore);
		expect(state.testStatus).toBe('idle');
		expect(state.deviceStatus).toBe('idle');
		expect(state.stimulusWords).toEqual([]);
		expect(state.currentWordIndex).toBe(-1);
	});

	it('initializes participant', () => {
		kawasakiStore.initializeParticipant();
		const state = get(kawasakiStore);
		expect(state.participantId).toBeTruthy();
		expect(state.events.some((e) => e.type === 'participant_initialized')).toBe(true);
	});

	it('sets stimulus words', () => {
		const words: Word[] = [
			{ word: 'test', key: '1' },
			{ word: 'test2', key: '2' }
		];
		kawasakiStore.setStimulusWords(words);
		const state = get(kawasakiStore);
		expect(state.stimulusWords).toEqual(words);
	});

	it('starts session', () => {
		const words: Word[] = [
			{ word: 'test', key: '1' },
			{ word: 'test2', key: '2' }
		];
		kawasakiStore.setStimulusWords(words);
		kawasakiStore.startSession(2);
		const state = get(kawasakiStore);
		expect(state.testStatus).toBe('session-1-running');
		expect(state.currentWordIndex).toBe(0);
	});

	it('records word response', () => {
		const words: Word[] = [{ word: 'test', key: '1' }];
		kawasakiStore.setStimulusWords(words);
		kawasakiStore.startSession(1);
		kawasakiStore.recordWordResponse({
			responseWord: 'response',
			reactionTimeMs: 1000
		});
		const state = get(kawasakiStore);
		expect(state.wordResponses.length).toBe(1);
		expect(state.wordResponses[0]?.responseWord).toBe('response');
		expect(state.wordResponses[0]?.reactionTimeMs).toBe(1000);
	});
});
