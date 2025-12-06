import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		},
		// pnpmのシンボリックリンク構造に対応
		preserveSymlinks: false
	},
	server: {
		host: '0.0.0.0',
		port: 3000,
		allowedHosts: [
			'svelte.spirit-in-physics.orb.local',
			'localhost',
			'.orb.local'
		],
		hmr: {
			protocol: 'ws',
			host: process.env.VITE_HMR_HOST || 'localhost',
			port: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : 3000,
			clientPort: process.env.VITE_HMR_CLIENT_PORT ? parseInt(process.env.VITE_HMR_CLIENT_PORT) : 3000
		},
		watch: {
			usePolling: true,
			interval: 1000
		}
	},
	optimizeDeps: {
		include: ['d3'] // D3を事前バンドルに含める
	},
	ssr: {
		external: ['d3'], // SSRではD3を外部依存として扱う（ブラウザでのみ使用）
		noExternal: ['typegpu'], // TypeGPUはSSRでも使用可能にする
		// SvelteKitのクライアントモジュールはSvelteKitプラグインが自動的に処理する
		// 明示的な設定は不要（SvelteKitプラグインが適切に処理）
		resolve: {
			conditions: ['import', 'module', 'default'],
			externalConditions: ['import', 'module', 'default']
		}
	}
});
