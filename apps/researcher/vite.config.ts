import { sveltekit } from '@sveltejs/kit/vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		paraglide({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			disablePreprocessor: true
		}),
		sveltekit()
	],
	server: {
		port: 3001,
		host: true,
		allowedHosts: true,
		proxy: {
			'/api': {
				target: 'http://localhost:8090',
				changeOrigin: true
			}
		}
	},
	preview: {
		port: 3001,
		host: true,
		proxy: {
			'/api': {
				target: 'http://localhost:8090',
				changeOrigin: true
			}
		}
	}
});
