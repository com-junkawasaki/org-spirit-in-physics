// Server-side hooks are not used for client-side localStorage language detection.
export const handle = ({ event, resolve }) => {
	return resolve(event);
};
