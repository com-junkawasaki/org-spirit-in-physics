// JUNG stimulus words constants
// Full list will be loaded from GraphQL API

export interface JungWord {
	id: string;
	japanese: string;
	english: string;
	pronunciation?: string;
}

// Placeholder - actual data will come from GraphQL
export const JUNG_STIMULUS_WORDS: JungWord[] = [];
