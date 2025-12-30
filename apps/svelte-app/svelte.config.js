import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltex } from 'sveltex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.svx', '.sveltex', '.md'],
	preprocess: [
		vitePreprocess(),
		sveltex({
			extensions: ['.svx', '.sveltex', '.md'],
			math: {
				engine: 'katex',
			}
		})
	],
	kit: {
		adapter: adapter({
			// default options are shown. On some platforms
			// these options are set automatically — see below
			pages: 'build',
			assets: 'build',
			fallback: 'spa.html', // SPA mode fallback
			precompress: false,
			strict: false
		}),
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
