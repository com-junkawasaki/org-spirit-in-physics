import { HoudiniClient } from '$houdini';
import { browser } from '$app/environment';

export const client = new HoudiniClient({
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
