import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GRAPHQL_API_URL =
	process.env.GRAPHQL_API_URL || 'http://graphql-service:8080/api/graphql';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const headers = new Headers(request.headers);
	headers.set('Content-Type', 'application/json');

	const response = await fetch(GRAPHQL_API_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	const data = await response.json();
	return json(data);
};
