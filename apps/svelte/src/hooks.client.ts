import { setClient } from '$houdini';
import { client } from '$lib/graphql/client';
import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
import { initializeClerk } from 'svelte-clerk';

// Initialize Clerk client
if (PUBLIC_CLERK_PUBLISHABLE_KEY) {
	initializeClerk(PUBLIC_CLERK_PUBLISHABLE_KEY, {
		afterSignInUrl: '/',
		afterSignUpUrl: '/',
		signInUrl: '/sign-in',
		signUpUrl: '/sign-up'
	});
}

// Initialize Houdini client
setClient(client);
