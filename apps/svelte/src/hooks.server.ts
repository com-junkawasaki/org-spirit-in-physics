import { CLERK_SECRET_KEY } from '$env/static/private';
import { clerkPlugin } from '@clerk/sveltekit/server';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = sequence(
	clerkPlugin({
		secretKey: CLERK_SECRET_KEY,
		protectedPaths: ['/admin', '/researcher'],
		signInUrl: '/sign-in'
	})
);
