import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = sequence(async ({ event, resolve }) => {
	// Add any server-side authentication checks here if needed
	const response = await resolve(event);
	return response;
});
