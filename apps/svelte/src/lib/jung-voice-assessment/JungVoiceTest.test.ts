import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import JungVoiceTest from './JungVoiceTest.svelte';
import { kawasakiStore } from './store';

describe('JungVoiceTest', () => {
	beforeEach(() => {
		// Reset store before each test
		kawasakiStore.resetTest();
	});

	it('renders preflight screen initially', () => {
		render(JungVoiceTest, { numberOfWords: 10 });
		expect(screen.getByText('デバイスチェック')).toBeInTheDocument();
		expect(screen.getByText('ようこそ')).toBeInTheDocument();
	});

	it('shows device check button', () => {
		render(JungVoiceTest, { numberOfWords: 10 });
		expect(screen.getByText('デバイスを確認')).toBeInTheDocument();
	});

	it('handles device access', async () => {
		const user = userEvent.setup();
		render(JungVoiceTest, { numberOfWords: 10 });

		const checkButton = screen.getByText('デバイスを確認');
		await user.click(checkButton);

		// Wait for async operation
		await waitFor(() => {
			expect(screen.queryByText('デバイスを確認中...')).toBeInTheDocument();
		});
	});

	it('displays welcome message', () => {
		render(JungVoiceTest, { numberOfWords: 10 });
		expect(screen.getByText(/ようこそ/)).toBeInTheDocument();
	});
});
