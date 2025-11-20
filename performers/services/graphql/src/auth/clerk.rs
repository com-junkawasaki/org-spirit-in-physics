// Merkle DAG: graphql.service.auth.clerk
// Clerk JWT verification using JWKS

use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};

use crate::auth::context::AuthContext;

/// Clerk JWT claims structure
#[derive(Debug, Serialize, Deserialize)]
struct ClerkClaims {
    /// Subject (user ID)
    sub: String,
    /// Session ID
    sid: Option<String>,
    /// Email
    email: Option<String>,
    /// Issuer
    iss: Option<String>,
    /// Audience
    aud: Option<String>,
    /// Expiration time
    exp: i64,
    /// Issued at
    iat: i64,
}

/// JWKS (JSON Web Key Set) structure
#[derive(Debug, Deserialize)]
struct JWKS {
    keys: Vec<JWK>,
}

/// JSON Web Key structure
#[derive(Debug, Deserialize, Clone)]
struct JWK {
    /// Key ID
    kid: String,
    /// Key type
    kty: String,
    /// Algorithm
    alg: String,
    /// Public key use
    use_: Option<String>,
    /// RSA modulus
    n: Option<String>,
    /// RSA exponent
    e: Option<String>,
}

/// Clerk JWT verifier with JWKS caching
pub struct ClerkVerifier {
    /// Clerk domain (e.g., "enough-chipmunk-92.clerk.accounts.dev")
    clerk_domain: String,
    /// JWKS cache with TTL
    jwks_cache: Arc<RwLock<Option<(HashMap<String, DecodingKey>, u64)>>>,
    /// Cache TTL in seconds (default: 1 hour)
    cache_ttl: u64,
}

impl ClerkVerifier {
    /// Create a new Clerk verifier
    pub fn new(clerk_domain: String) -> Self {
        Self {
            clerk_domain,
            jwks_cache: Arc::new(RwLock::new(None)),
            cache_ttl: 3600, // 1 hour
        }
    }

    /// Get JWKS URL from Clerk domain
    fn jwks_url(&self) -> String {
        format!("https://{}/.well-known/jwks.json", self.clerk_domain)
    }

    /// Fetch JWKS from Clerk
    async fn fetch_jwks(&self) -> Result<HashMap<String, DecodingKey>, Box<dyn std::error::Error>> {
        let url = self.jwks_url();
        info!("Fetching JWKS from {}", url);

        let response = reqwest::get(&url).await?;
        let jwks: JWKS = response.json().await?;

        let mut keys = HashMap::new();
        for jwk in jwks.keys {
            if jwk.kty == "RSA" && jwk.n.is_some() && jwk.e.is_some() {
                // Convert JWK to DecodingKey
                // Note: jsonwebtoken crate expects PEM format, but JWKS provides modulus/exponent
                // We need to convert RSA modulus/exponent to PEM format
                if let Ok(decoding_key) = self.jwk_to_decoding_key(&jwk) {
                    keys.insert(jwk.kid.clone(), decoding_key);
                }
            }
        }

        Ok(keys)
    }

    /// Convert JWK to DecodingKey
    fn jwk_to_decoding_key(&self, jwk: &JWK) -> Result<DecodingKey, Box<dyn std::error::Error>> {
        use rsa::RsaPublicKey;
        use rsa::pkcs1::{EncodeRsaPublicKey, LineEnding};
        
        // Decode base64url encoded modulus and exponent
        let n_bytes = URL_SAFE_NO_PAD.decode(
            jwk.n.as_ref().ok_or("Missing modulus (n) in JWK")?
        )?;
        let e_bytes = URL_SAFE_NO_PAD.decode(
            jwk.e.as_ref().ok_or("Missing exponent (e) in JWK")?
        )?;

        // Create RSA public key from modulus and exponent
        let n = rsa::BigUint::from_bytes_be(&n_bytes);
        let e = rsa::BigUint::from_bytes_be(&e_bytes);
        
        let public_key = RsaPublicKey::new(n, e)
            .map_err(|e| format!("Failed to create RSA public key: {}", e))?;

        // Convert to PEM format
        let pem = public_key.to_pkcs1_pem(LineEnding::LF)
            .map_err(|e| format!("Failed to encode RSA public key to PEM: {}", e))?;
        
        // Create DecodingKey from PEM
        Ok(DecodingKey::from_rsa_pem(pem.as_bytes())?)
    }

    /// Get JWKS from cache or fetch if expired/missing
    async fn get_jwks(&self) -> Result<HashMap<String, DecodingKey>, Box<dyn std::error::Error>> {
        // Check cache
        let cache = self.jwks_cache.read().await;
        if let Some((keys, cached_at)) = cache.as_ref() {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            
            if now - cached_at < self.cache_ttl {
                return Ok(keys.clone());
            }
        }
        drop(cache);

        // Fetch new JWKS
        let keys = self.fetch_jwks().await?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Update cache
        let mut cache = self.jwks_cache.write().await;
        *cache = Some((keys.clone(), now));

        Ok(keys)
    }

    /// Verify Clerk JWT token and extract claims
    pub async fn verify_token(&self, token: &str) -> Result<AuthContext, Box<dyn std::error::Error>> {
        // Decode header to get kid (key ID)
        let header = decode_header(token)?;
        let kid = header.kid.ok_or("Missing kid in JWT header")?;

        // Get JWKS
        let jwks = self.get_jwks().await?;
        let decoding_key = jwks
            .get(&kid)
            .ok_or_else(|| format!("Key ID {} not found in JWKS", kid))?;

        // Validate token
        let mut validation = Validation::new(Algorithm::RS256);
        validation.validate_exp = true;
        validation.leeway = 60; // 60 seconds leeway for clock skew
        
        // Set issuer validation (Clerk issuer format: https://{domain}/)
        let issuer = format!("https://{}/", self.clerk_domain);
        validation.set_issuer(&[issuer.as_str()]);

        // Decode and verify token
        let token_data = decode::<ClerkClaims>(token, decoding_key, &validation)?;
        let claims = token_data.claims;

        // Create auth context
        Ok(AuthContext::new(
            claims.sub,
            claims.sid,
            claims.email,
        ))
    }
}

/// Extract JWT token from Authorization header
pub fn extract_token_from_header(auth_header: Option<&str>) -> Option<String> {
    auth_header?
        .strip_prefix("Bearer ")
        .map(|s| s.trim().to_string())
}

/// Get Clerk domain from environment variables
/// Tries CLERK_DOMAIN first, then extracts from CLERK_PUBLISHABLE_KEY if available
/// 
/// Note: CLERK_PUBLISHABLE_KEY extraction is complex and may not always work.
/// It's recommended to set CLERK_DOMAIN explicitly.
pub fn get_clerk_domain() -> Option<String> {
    // Try CLERK_DOMAIN first (recommended)
    if let Ok(domain) = std::env::var("CLERK_DOMAIN") {
        if !domain.is_empty() {
            return Some(domain);
        }
    }

    // Try CLERK_FRONTEND_API (alternative environment variable)
    if let Ok(domain) = std::env::var("CLERK_FRONTEND_API") {
        if !domain.is_empty() {
            return Some(domain);
        }
    }

    // Note: Extracting domain from CLERK_PUBLISHABLE_KEY is complex
    // because it's base64url-encoded JSON. It's better to set CLERK_DOMAIN explicitly.
    // For now, we'll return None and let the caller handle the error.
    None
}

/// Verify Clerk JWT token from Authorization header
pub async fn verify_clerk_token(
    auth_header: Option<&str>,
    clerk_domain: Option<String>,
) -> Result<AuthContext, Box<dyn std::error::Error>> {
    let token = extract_token_from_header(auth_header)
        .ok_or("Missing or invalid Authorization header")?;

    let domain = clerk_domain
        .or_else(get_clerk_domain)
        .ok_or("CLERK_DOMAIN environment variable is required. Set it to your Clerk instance domain (e.g., 'enough-chipmunk-92.clerk.accounts.dev')")?;

    let verifier = ClerkVerifier::new(domain);
    verifier.verify_token(&token).await
}

