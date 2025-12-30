import * as runtime from "$lib/paraglide/runtime.js";
import { browser } from "$app/environment";

// Svelte 5 reactive state
let tag = $state<string>(runtime.sourceLanguageTag); 

if (browser) {
	// Check URL parameter first (e.g. ?lang=en)
	const urlParams = new URLSearchParams(window.location.search);
	const langParam = urlParams.get('lang');
	
	const isAvailable = (l: string | null): l is string => 
		!!l && runtime.availableLanguageTags.includes(l as any);

	if (isAvailable(langParam)) {
		tag = langParam;
		localStorage.setItem("preferredLanguage", tag);
	} else {
		const saved = localStorage.getItem("preferredLanguage");
		if (isAvailable(saved)) {
			tag = saved;
		} else {
			// Fallback to browser language if available
			const browserLang = navigator.language.split('-')[0];
			if (isAvailable(browserLang)) {
				tag = browserLang;
			}
		}
	}
}

// Tell paraglide to use this reactive state
runtime.setLanguageTag(() => tag as any);

export const languageTag = () => tag;
export const setLanguageTag = (value: string) => {
	if (runtime.availableLanguageTags.includes(value as any)) {
		tag = value;
		if (browser) {
			localStorage.setItem("preferredLanguage", value);
		}
	}
};
export const availableLanguageTags = runtime.availableLanguageTags;
export const sourceLanguageTag = runtime.sourceLanguageTag;
