//! GraphQL Client Exports
//! 
//! Merkle DAG: graphql.index
//! OWL: spirit:GraphQL Service Port exports

export { apolloClient } from './client';
export * from './hooks';
export * from './queries/participants';
export * from './queries/sessions';
export * from './queries/analysis';
export * from './queries/consent';
export * from './queries/emotions';
export * from './queries/session_events';
export * from './mutations/activities';
export * from './mutations/analyzer';

// Re-export for convenience
export { GET_PARTICIPANTS, GET_PARTICIPANT } from './queries/participants';
export { GET_SESSIONS, GET_SESSIONS_BY_PARTICIPANT } from './queries/sessions';
export { GET_ANALYSIS_RESULTS } from './queries/analysis';
export { GET_CONSENT } from './queries/consent';
export { GET_EMOTION_RESULTS, GET_EMOTION_STATISTICS } from './queries/emotions';
export { GET_SESSION_EVENTS } from './queries/session_events';

