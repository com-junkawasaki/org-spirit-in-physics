import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('houdini').ConfigFile} */
const config = {
	watchSchema: {
		url: 'http://localhost:8080/api/graphql',
		headers: {
			'Content-Type': 'application/json'
		}
	},
	plugins: {
		'houdini-svelte': {},
		'houdini-plugin-svelte-global-stores': {}
	},
	scalars: {
		DateTime: {
			type: 'Date',
			unmarshal(val) {
				return new Date(val);
			},
			marshal(date) {
				return date.toISOString();
			}
		},
		JSON: {
			type: 'any',
			unmarshal(val) {
				return val;
			},
			marshal(val) {
				return val;
			}
		}
	},
	schemaPath: './graphql-schema.graphql'
};

export default config;
