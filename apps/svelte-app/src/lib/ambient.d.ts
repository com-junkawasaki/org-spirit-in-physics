declare module "*.md" {
	import { Component } from "svelte";
	const component: Component;
	export default component;
}

declare module "katex/dist/contrib/auto-render.mjs" {
	const renderMathInElement: (element: HTMLElement, options?: any) => void;
	export default renderMathInElement;
}




