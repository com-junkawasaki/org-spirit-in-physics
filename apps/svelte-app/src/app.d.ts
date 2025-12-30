import { AvailableLanguageTag } from "$lib/paraglide/runtime.js";

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module "*.md" {
	import { Component } from "svelte";
	const component: Component;
	export default component;
}

declare module "katex/dist/contrib/auto-render.mjs" {
	export default function renderMathInElement(element: HTMLElement, options?: any): void;
}

export {};

