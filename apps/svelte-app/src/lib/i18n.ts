import { createI18n } from "@inlang/paraglide-sveltekit";
import * as runtime from "$lib/paraglide/runtime.js";

export const i18n = createI18n(runtime, {
    pathnames: {},
    prefixDefaultLanguage: "always", // Set to always for consistent URL structure like /en/, /ja/
});

