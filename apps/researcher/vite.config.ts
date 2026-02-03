import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 3002,
		host: true,
		allowedHosts: true
	},
	preview: {
		port: 3002,
		host: true
	}
});
