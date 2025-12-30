import { preferenceClient } from "$lib/connect";

export type Theme = 'light' | 'dark' | 'system';

class ThemeManager {
	current = $state<Theme>('system');
	userId: string | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('theme') as Theme | null;
			if (saved) {
				this.current = saved;
			}
			this.apply();

			window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
				if (this.current === 'system') {
					this.apply();
				}
			});
		}
	}

	setUserId(id: string) {
		this.userId = id;
		this.syncFromBackend();
	}

	async syncFromBackend() {
		if (!this.userId) return;
		try {
			const res = await preferenceClient.getPreference({ userId: this.userId });
			if (res.preference?.theme) {
				this.current = res.preference.theme as Theme;
				localStorage.setItem('theme', this.current);
				this.apply();
			}
		} catch (e) {
			console.error("Failed to sync theme from backend:", e);
		}
	}

	async set(theme: Theme) {
		this.current = theme;
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', theme);
			this.apply();

			if (this.userId) {
				try {
					await preferenceClient.updatePreference({
						userId: this.userId,
						theme: theme
					});
				} catch (e) {
					console.error("Failed to update theme on backend:", e);
				}
			}
		}
	}

	apply() {
		if (typeof window === 'undefined') return;

		const root = window.document.documentElement;
		const isDark = 
			this.current === 'dark' || 
			(this.current === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		
		if (isDark) {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
	}
}

export const theme = new ThemeManager();

