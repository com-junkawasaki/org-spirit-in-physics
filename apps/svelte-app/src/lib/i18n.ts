import * as runtime from "$lib/paraglide/runtime.js";
import { browser } from "$app/environment";

// Simple variable
let tag = runtime.sourceLanguageTag;

if (browser) {
	const saved = localStorage.getItem("preferredLanguage");
	if (saved === "en" || saved === "ja") {
		tag = saved as "en" | "ja";
	}
}

// Tell paraglide to use this value
runtime.setLanguageTag(tag);

export const languageTag = () => tag;
export const setLanguageTag = (value: "en" | "ja") => {
	tag = value;
	if (browser) {
		localStorage.setItem("preferredLanguage", value);
		// Force reload to apply changes everywhere
		window.location.reload();
	}
};
export const availableLanguageTags = runtime.availableLanguageTags;
export const sourceLanguageTag = runtime.sourceLanguageTag;
