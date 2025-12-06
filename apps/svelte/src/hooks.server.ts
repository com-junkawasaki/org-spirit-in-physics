import { CLERK_SECRET_KEY } from '$env/static/private';
import { clerkPlugin } from '@clerk/sveltekit/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = clerkPlugin({
	secretKey: CLERK_SECRET_KEY
});
