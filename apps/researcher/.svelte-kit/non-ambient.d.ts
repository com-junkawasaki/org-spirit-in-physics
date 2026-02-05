
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/participants" | "/participants/[id]" | "/sessions" | "/settings";
		RouteParams(): {
			"/participants/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/participants": { id?: string };
			"/participants/[id]": { id: string };
			"/sessions": Record<string, never>;
			"/settings": Record<string, never>
		};
		Pathname(): "/" | "/participants" | "/participants/" | `/participants/${string}` & {} | `/participants/${string}/` & {} | "/sessions" | "/sessions/" | "/settings" | "/settings/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}