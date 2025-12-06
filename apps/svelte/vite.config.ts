import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	server: {
		host: '0.0.0.0',
		port: 3000,
		allowedHosts: [
			'svelte.spirit-in-physics.orb.local',
			'localhost',
			'.orb.local'
		],
		watch: {
			usePolling: true,
			interval: 1000
		}
	}
});
