import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// default options are shown. On some platforms
			// these options are set automatically — see below
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // SPA mode fallback
			precompress: false,
			strict: true
		}),
		prerender: {
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
