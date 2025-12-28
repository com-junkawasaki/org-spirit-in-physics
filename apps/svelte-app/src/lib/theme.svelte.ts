export type Theme = 'light' | 'dark' | 'system';

class ThemeManager {
	current = $state<Theme>('system');

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

	set(theme: Theme) {
		this.current = theme;
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', theme);
			this.apply();
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

