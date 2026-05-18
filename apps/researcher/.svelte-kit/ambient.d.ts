
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const TERM_PROGRAM: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const CLAUDE_EFFORT: string;
	export const NODE: string;
	export const INIT_CWD: string;
	export const TERM: string;
	export const SHELL: string;
	export const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
	export const TMPDIR: string;
	export const TERM_PROGRAM_VERSION: string;
	export const DIRENV_DIR: string;
	export const npm_config_npm_globalconfig: string;
	export const ZDOTDIR: string;
	export const TERM_SESSION_ID: string;
	export const npm_config_registry: string;
	export const PNPM_HOME: string;
	export const AI_AGENT: string;
	export const GIT_EDITOR: string;
	export const USER: string;
	export const NVM_DIR: string;
	export const FIREBASE_PRIVATE_KEY: string;
	export const npm_config_globalconfig: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const SSH_AUTH_SOCK: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const npm_execpath: string;
	export const DIRENV_WATCHES: string;
	export const FIREBASE_PROJECT_ID: string;
	export const npm_config_frozen_lockfile: string;
	export const npm_config_verify_deps_before_run: string;
	export const PATH: string;
	export const GITPOD_250926: string;
	export const npm_package_json: string;
	export const __CFBundleIdentifier: string;
	export const PWD: string;
	export const npm_command: string;
	export const EDITOR: string;
	export const npm_config__jsr_registry: string;
	export const npm_lifecycle_event: string;
	export const LANG: string;
	export const npm_package_name: string;
	export const NODE_PATH: string;
	export const XPC_FLAGS: string;
	export const NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
	export const NEXT_PUBLIC_FIREBASE_APP_ID: string;
	export const npm_config_node_gyp: string;
	export const XPC_SERVICE_NAME: string;
	export const OPENROUTER_APIKEY: string;
	export const DIRENV_FILE: string;
	export const npm_package_version: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const HOME: string;
	export const SHLVL: string;
	export const CLAUDE_CODE_EXECPATH: string;
	export const npm_config_strict_ssl: string;
	export const npm_config_store_dir: string;
	export const LOGNAME: string;
	export const VISUAL: string;
	export const npm_lifecycle_script: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const npm_config_ignore_scripts: string;
	export const npm_config_user_agent: string;
	export const CLAUDE_CODE_SESSION_ID: string;
	export const NEXT_PUBLIC_FIREBASE_API_KEY: string;
	export const FIREBASE_CLIENT_EMAIL: string;
	export const OSLogRateLimit: string;
	export const DIRENV_DIFF: string;
	export const CLAUDECODE: string;
	export const COLORTERM: string;
	export const npm_node_execpath: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		NoDefaultCurrentDirectoryInExePath: string;
		TERM_PROGRAM: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		CLAUDE_EFFORT: string;
		NODE: string;
		INIT_CWD: string;
		TERM: string;
		SHELL: string;
		NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
		TMPDIR: string;
		TERM_PROGRAM_VERSION: string;
		DIRENV_DIR: string;
		npm_config_npm_globalconfig: string;
		ZDOTDIR: string;
		TERM_SESSION_ID: string;
		npm_config_registry: string;
		PNPM_HOME: string;
		AI_AGENT: string;
		GIT_EDITOR: string;
		USER: string;
		NVM_DIR: string;
		FIREBASE_PRIVATE_KEY: string;
		npm_config_globalconfig: string;
		PNPM_SCRIPT_SRC_DIR: string;
		SSH_AUTH_SOCK: string;
		__CF_USER_TEXT_ENCODING: string;
		npm_execpath: string;
		DIRENV_WATCHES: string;
		FIREBASE_PROJECT_ID: string;
		npm_config_frozen_lockfile: string;
		npm_config_verify_deps_before_run: string;
		PATH: string;
		GITPOD_250926: string;
		npm_package_json: string;
		__CFBundleIdentifier: string;
		PWD: string;
		npm_command: string;
		EDITOR: string;
		npm_config__jsr_registry: string;
		npm_lifecycle_event: string;
		LANG: string;
		npm_package_name: string;
		NODE_PATH: string;
		XPC_FLAGS: string;
		NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
		NEXT_PUBLIC_FIREBASE_APP_ID: string;
		npm_config_node_gyp: string;
		XPC_SERVICE_NAME: string;
		OPENROUTER_APIKEY: string;
		DIRENV_FILE: string;
		npm_package_version: string;
		pnpm_config_verify_deps_before_run: string;
		HOME: string;
		SHLVL: string;
		CLAUDE_CODE_EXECPATH: string;
		npm_config_strict_ssl: string;
		npm_config_store_dir: string;
		LOGNAME: string;
		VISUAL: string;
		npm_lifecycle_script: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		npm_config_ignore_scripts: string;
		npm_config_user_agent: string;
		CLAUDE_CODE_SESSION_ID: string;
		NEXT_PUBLIC_FIREBASE_API_KEY: string;
		FIREBASE_CLIENT_EMAIL: string;
		OSLogRateLimit: string;
		DIRENV_DIFF: string;
		CLAUDECODE: string;
		COLORTERM: string;
		npm_node_execpath: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
