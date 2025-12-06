import { browser } from '$app/environment';
import { GraphQLClient } from 'graphql-request';

// GraphQL client (using graphql-request instead of Houdini for now)
// Houdini can be integrated later when properly configured
const graphqlUrl = browser
	? '/api/graphql'
	: process.env.GRAPHQL_API_URL || 'http://graphql-service:8081/graphql';

export const client = new GraphQLClient(graphqlUrl, {
	headers: {
		'Content-Type': 'application/json'
	}
});

// For backward compatibility with Houdini-style API
export async function getClient() {
	return client;
}
