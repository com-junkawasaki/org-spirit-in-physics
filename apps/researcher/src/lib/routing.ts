import { i18n } from "$lib/i18n";
import { languageTag } from "$lib/paraglide/runtime.js";

/**
 * Resolves a route path with the current language tag.
 * This is a unified utility function for route resolution across the application.
 * 
 * @param path - The route path to resolve (e.g., "/experiment", "/researcher")
 * @returns The resolved route path with language prefix if needed
 */
export function resolveRoute(path: string): string {
  return i18n.resolveRoute(path, languageTag());
}

