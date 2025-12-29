import * as runtime from "$lib/paraglide/runtime.js";
import { browser } from "$app/environment";

// Svelte 5 reactive state
let tag = $state<"en" | "ja">("en"); 

if (browser) {
	// Check URL parameter first (e.g. ?lang=en)
	const urlParams = new URLSearchParams(window.location.search);
	const langParam = urlParams.get('lang');
	
	if (langParam === "en" || langParam === "ja") {
		tag = langParam as "en" | "ja";
		localStorage.setItem("preferredLanguage", tag);
	} else {
		const saved = localStorage.getItem("preferredLanguage");
		if (saved === "en" || saved === "ja") {
			tag = saved as "en" | "ja";
		}
	}
}

// Tell paraglide to use this reactive state
runtime.setLanguageTag(() => tag);

export const languageTag = () => tag;
export const setLanguageTag = (value: "en" | "ja") => {
	tag = value;
	if (browser) {
		localStorage.setItem("preferredLanguage", value);
	}
};
export const availableLanguageTags = runtime.availableLanguageTags;
export const sourceLanguageTag = runtime.sourceLanguageTag;
