import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GRAPHQL_API_URL =
	process.env.GRAPHQL_API_URL || 'http://graphql-service:8081/graphql';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		
		// Create new headers without host and other problematic headers
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		const response = await fetch(GRAPHQL_API_URL, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			console.error('GraphQL API error:', response.status, response.statusText);
			const errorText = await response.text();
			console.error('Error response:', errorText);
			return json({ errors: [{ message: `GraphQL API error: ${response.status} ${response.statusText}` }] }, { status: response.status });
		}

		const data = await response.json();
		return json(data);
	} catch (error: any) {
		console.error('Error in GraphQL proxy:', error);
		return json({ errors: [{ message: error.message || 'Unknown error' }] }, { status: 500 });
	}
};
