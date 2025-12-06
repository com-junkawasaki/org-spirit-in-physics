import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md', '.mdx'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			remarkPlugins: [remarkMath, remarkGfm],
			rehypePlugins: [rehypeKatex]
		})
	],

	kit: {
		adapter: adapter(),
		alias: {
			$lib: './src/lib'
		}
	}
};

export default config;
