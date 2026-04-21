import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltex } from '@nvl/sveltex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.svx', '.sveltex', '.md'],
	preprocess: [
		vitePreprocess(),
		sveltex({
			mathBackend: 'katex',
		})
	],
	kit: {
		adapter: adapter(),
		prerender: {
			handleHttpError: 'warn',
			handleUnseenRoutes: 'ignore'
		},
		paths: {
			relative: false
		},
		alias: {
			'@/*': './src/*'
		}
	}
};

export default config;
