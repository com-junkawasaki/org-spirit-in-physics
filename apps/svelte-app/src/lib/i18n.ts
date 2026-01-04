import { createI18n } from "@inlang/paraglide-sveltekit";
import * as runtime from "$lib/paraglide/runtime.js";

console.log("[i18n] Initializing with runtime tags:", runtime.availableLanguageTags);

export const i18n = createI18n(runtime, {
    pathnames: {},
    prefixDefaultLanguage: "never", 
});
