import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

const isProtectedRoute = (pathname: string): boolean => {
	return pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/researcher');
};

export const requireAuth = async (event: RequestEvent) => {
	const { userId } = event.locals;
	
	if (isProtectedRoute(event.url.pathname) && !userId) {
		throw redirect(302, '/sign-in');
	}
	
	return userId;
};
