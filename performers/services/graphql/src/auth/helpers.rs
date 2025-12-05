// Merkle DAG: graphql.service.auth.helpers
// Authentication helper functions for GraphQL resolvers

use juniper::FieldError;
use crate::auth::context::AuthContext;
use crate::schema::Context;

/// Require authentication and return auth context
pub fn require_auth(ctx: &Context) -> Result<AuthContext, FieldError> {
    ctx.auth.clone().ok_or_else(|| FieldError::new(
        "Authentication required",
        juniper::Value::Null,
    ))
}

/// Get optional auth context (for operations that work with or without auth)
pub fn get_auth(ctx: &Context) -> Option<AuthContext> {
    ctx.auth.clone()
}
