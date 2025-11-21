// Merkle DAG: graphql.service.auth.context
// Authentication context for GraphQL resolvers

use serde::{Deserialize, Serialize};

/// Authentication context containing user information from Supabase JWT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthContext {
    /// Supabase user ID (UUID from JWT 'sub' claim)
    pub user_id: String,
    /// Session ID (Supabase JWT doesn't include session ID, so this is typically None)
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

