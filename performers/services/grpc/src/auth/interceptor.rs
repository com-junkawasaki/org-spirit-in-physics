// Merkle DAG: grpc.service.auth.interceptor
// gRPC authentication interceptor for Supabase tokens

use tonic::{Request, Status};
use crate::auth::supabase::{verify_supabase_token, AuthContext};

/// Extract auth context from request metadata
pub async fn extract_auth_context(request: &Request<()>) -> Result<Option<AuthContext>, Status> {
    let metadata = request.metadata();
    
    // Get Authorization header
    let auth_header = metadata
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .or_else(|| {
            // Also check for lowercase header name (some clients send it lowercase)
            metadata
                .get("Authorization")
                .and_then(|v| v.to_str().ok())
        });

    if let Some(header) = auth_header {
        match verify_supabase_token(Some(header), None).await {
            Ok(context) => Ok(Some(context)),
            Err(e) => {
                // Log error but don't fail - allow unauthenticated requests
                tracing::warn!("Failed to verify token: {}", e);
                Ok(None)
            }
        }
    } else {
        Ok(None)
    }
}

/// Auth interceptor trait for tonic services
pub struct AuthInterceptor;

impl AuthInterceptor {
    /// Create a new auth interceptor
    pub fn new() -> Self {
        Self
    }
}

