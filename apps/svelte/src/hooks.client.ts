import { setClient } from '$houdini';
import { client } from '$lib/graphql/client';
import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
import { initializeClerkClient } from '@clerk/sveltekit/client';

// Initialize Clerk client
initializeClerkClient(PUBLIC_CLERK_PUBLISHABLE_KEY, {
	afterSignInUrl: '/',
	afterSignUpUrl: '/',
	signInUrl: '/sign-in',
	signUpUrl: '/sign-up'
});

// Initialize Houdini client
setClient(client);
