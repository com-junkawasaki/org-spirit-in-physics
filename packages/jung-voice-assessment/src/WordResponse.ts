import type { WordResponse as WordResponseSchema } from "./schema";

// Extend the WordResponse interface with runtime-only properties
export interface WordResponseWithExtras extends WordResponseSchema {
  isDelayed: boolean;
}

/**
 * Helper function to cast WordResponse to WordResponseWithExtras
 */
export function withExtras(response: WordResponseSchema): WordResponseWithExtras {
  return response as WordResponseWithExtras;
}

