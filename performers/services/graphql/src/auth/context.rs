// Merkle DAG: graphql.service.auth.context
// Authentication context for GraphQL resolvers

use serde::{Deserialize, Serialize};

/// Authentication context containing user information from Clerk JWT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthContext {
    /// Clerk user ID
    pub user_id: String,
    /// Clerk session ID
    pub session_id: Option<String>,
    /// User email (if available)
    pub email: Option<String>,
}

impl AuthContext {
    pub fn new(user_id: String, session_id: Option<String>, email: Option<String>) -> Self {
        Self {
            user_id,
            session_id,
            email,
        }
    }
}

