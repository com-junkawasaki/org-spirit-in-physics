import { browser } from '$app/environment';

// Houdini client (lazy initialization)
// Note: Houdini is optional and will be initialized when needed
let houdiniClient: any = null;

export async function getClient() {
	if (!houdiniClient) {
		try {
			// Try to import Houdini (may not be available if not configured)
			const houdiniModule = await import('$houdini').catch(() => null);
			if (houdiniModule && houdiniModule.HoudiniClient) {
				houdiniClient = new houdiniModule.HoudiniClient({
					url: browser
						? '/api/graphql'
						: process.env.GRAPHQL_API_URL || 'http://graphql-service:8080/api/graphql',
					fetchParams({ session }) {
						return {
							headers: {
								'Content-Type': 'application/json',
								...(session?.token && { Authorization: `Bearer ${session.token}` })
							}
						};
					}
				});
			} else {
				console.warn('Houdini is not configured. GraphQL features may be limited.');
				return null;
			}
		} catch (error) {
			console.warn('Houdini client not available:', error);
			return null;
		}
	}
	return houdiniClient;
}

// For backward compatibility - returns a promise that resolves to the client
export const client = {
	get: getClient
};
