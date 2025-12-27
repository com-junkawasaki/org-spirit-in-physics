import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: 'index.html' // Use index.html for SPA
		}),
		paths: {
			relative: false
		},
		alias: {
			'@/*': './src/*'
		}
	}
};

export default config;
