// Merkle DAG: graphql.service.auth.helpers
// Authentication helper functions for GraphQL resolvers

use async_graphql::*;
use crate::auth::context::AuthContext;

/// Require authentication and return auth context
pub fn require_auth(ctx: &Context<'_>) -> Result<AuthContext> {
    ctx.data::<AuthContext>()
        .map_err(|_| Error::new("Authentication required"))
        .cloned()
}

/// Get optional auth context (for operations that work with or without auth)
pub fn get_auth(ctx: &Context<'_>) -> Option<AuthContext> {
    ctx.data::<AuthContext>().ok().cloned()
}

