import { CLERK_SECRET_KEY } from '$env/static/private';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

// svelte-clerk uses client-side authentication
// Server-side protection can be handled via middleware or route guards
export const handle: Handle = sequence(async ({ event, resolve }) => {
	// Add any server-side authentication checks here if needed
	// For now, svelte-clerk handles authentication on the client side
	
	const response = await resolve(event);
	return response;
});
