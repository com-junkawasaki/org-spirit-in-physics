import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte'],
	preprocess: [vitePreprocess()],
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'spa.html',
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
			'$lib': './src/lib',
			'@/*': './src/*'
		}
	}
};

export default config;
