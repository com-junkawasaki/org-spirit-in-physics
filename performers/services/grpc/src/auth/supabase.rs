// Merkle DAG: grpc.service.auth.supabase
// Supabase JWT verification using JWKS (reused from GraphQL service)

use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};

/// Supabase JWT claims structure
#[derive(Debug, Serialize, Deserialize)]
struct SupabaseClaims {
    /// Subject (user UUID)
    sub: String,
    /// Email
    email: Option<String>,
    /// Audience (typically "authenticated")
    aud: String,
    /// Role (typically "authenticated" or "anon")
    role: Option<String>,
    /// Issued at
    iat: i64,
    /// Expiration time
    exp: i64,
    /// Issuer
    iss: String,
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

/// Auth context for gRPC
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: String,
    pub email: Option<String>,
}

impl AuthContext {
    pub fn new(user_id: String, email: Option<String>) -> Self {
        Self { user_id, email }
    }

    pub fn is_authenticated(&self) -> bool {
        !self.user_id.is_empty()
    }
}

/// Supabase JWT verifier with JWKS caching
pub struct SupabaseVerifier {
    /// Supabase project reference (e.g., "xxxxx" from "https://xxxxx.supabase.co")
    project_ref: String,
    /// JWKS cache with TTL
    jwks_cache: Arc<RwLock<Option<(HashMap<String, DecodingKey>, u64)>>>,
    /// Cache TTL in seconds (default: 1 hour)
    cache_ttl: u64,
}

impl SupabaseVerifier {
    /// Create a new Supabase verifier
    pub fn new(project_ref: String) -> Self {
        Self {
            project_ref,
            jwks_cache: Arc::new(RwLock::new(None)),
            cache_ttl: 3600, // 1 hour
        }
    }

    /// Get JWKS URL from Supabase project reference
    fn jwks_url(&self) -> String {
        format!("https://{}.supabase.co/.well-known/jwks.json", self.project_ref)
    }

    /// Get issuer URL from Supabase project reference
    fn issuer_url(&self) -> String {
        format!("https://{}.supabase.co/auth/v1", self.project_ref)
    }

    /// Fetch JWKS from Supabase
    async fn fetch_jwks(&self) -> Result<HashMap<String, DecodingKey>, Box<dyn std::error::Error>> {
        let url = self.jwks_url();
        info!("Fetching JWKS from {}", url);

        let response = reqwest::get(&url).await?;
        let jwks: JWKS = response.json().await?;

        let mut keys = HashMap::new();
        for jwk in jwks.keys {
            if jwk.kty == "RSA" && jwk.n.is_some() && jwk.e.is_some() {
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
        
        let n_bytes = URL_SAFE_NO_PAD.decode(
            jwk.n.as_ref().ok_or("Missing modulus (n) in JWK")?
        )?;
        let e_bytes = URL_SAFE_NO_PAD.decode(
            jwk.e.as_ref().ok_or("Missing exponent (e) in JWK")?
        )?;

        let n = rsa::BigUint::from_bytes_be(&n_bytes);
        let e = rsa::BigUint::from_bytes_be(&e_bytes);
        
        let public_key = RsaPublicKey::new(n, e)
            .map_err(|e| format!("Failed to create RSA public key: {}", e))?;

        let pem = public_key.to_pkcs1_pem(LineEnding::LF)
            .map_err(|e| format!("Failed to encode RSA public key to PEM: {}", e))?;
        
        Ok(DecodingKey::from_rsa_pem(pem.as_bytes())?)
    }

    /// Get JWKS from cache or fetch if expired/missing
    async fn get_jwks(&self) -> Result<HashMap<String, DecodingKey>, Box<dyn std::error::Error>> {
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

        let keys = self.fetch_jwks().await?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let mut cache = self.jwks_cache.write().await;
        *cache = Some((keys.clone(), now));

        Ok(keys)
    }

    /// Verify Supabase JWT token and extract claims
    pub async fn verify_token(&self, token: &str) -> Result<AuthContext, Box<dyn std::error::Error>> {
        let header = decode_header(token)?;
        let kid = header.kid.ok_or("Missing kid in JWT header")?;

        let jwks = self.get_jwks().await?;
        let decoding_key = jwks
            .get(&kid)
            .ok_or_else(|| format!("Key ID {} not found in JWKS", kid))?;

        let mut validation = Validation::new(Algorithm::RS256);
        validation.validate_exp = true;
        validation.leeway = 60;
        
        let issuer = self.issuer_url();
        validation.set_issuer(&[issuer.as_str()]);

        let token_data = decode::<SupabaseClaims>(token, decoding_key, &validation)?;
        let claims = token_data.claims;

        Ok(AuthContext::new(
            claims.sub,
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

/// Extract Supabase project reference from SUPABASE_URL
pub fn extract_project_ref_from_url(url: &str) -> Option<String> {
    let url = url.trim_start_matches("https://").trim_start_matches("http://");
    
    if let Some(dot_pos) = url.find(".supabase.co") {
        let project_ref = url[..dot_pos].to_string();
        if !project_ref.is_empty() {
            return Some(project_ref);
        }
    }
    
    None
}

/// Get Supabase project reference from environment variables
pub fn get_supabase_project_ref() -> Option<String> {
    if let Ok(url) = std::env::var("SUPABASE_URL") {
        if !url.is_empty() {
            if let Some(project_ref) = extract_project_ref_from_url(&url) {
                return Some(project_ref);
            }
        }
    }

    None
}

/// Verify Supabase JWT token from Authorization header
pub async fn verify_supabase_token(
    auth_header: Option<&str>,
    supabase_url: Option<String>,
) -> Result<AuthContext, Box<dyn std::error::Error>> {
    let token = extract_token_from_header(auth_header)
        .ok_or("Missing or invalid Authorization header")?;

    let project_ref = if let Some(url) = supabase_url {
        extract_project_ref_from_url(&url)
            .ok_or_else(|| format!("Invalid SUPABASE_URL format: {}", url))?
    } else {
        get_supabase_project_ref()
            .ok_or("SUPABASE_URL environment variable is required")?
    };

    let verifier = SupabaseVerifier::new(project_ref);
    verifier.verify_token(&token).await
}

