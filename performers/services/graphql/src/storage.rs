// Merkle DAG: graphql.service.storage
// Supabase Storage client for file uploads

use anyhow::{Context, Result};
use reqwest::Client;
use std::env;

pub struct SupabaseStorage {
    client: Client,
    url: String,
    bucket: String,
    service_role_key: String,
}

impl SupabaseStorage {
    pub fn new() -> Result<Self> {
        let url = env::var("SUPABASE_URL")
            .context("SUPABASE_URL environment variable is required")?;
        let service_role_key = env::var("SUPABASE_SERVICE_ROLE_KEY")
            .context("SUPABASE_SERVICE_ROLE_KEY environment variable is required")?;
        let bucket = env::var("SUPABASE_STORAGE_BUCKET")
            .unwrap_or_else(|_| "spirit-in-physics".to_string());

        Ok(Self {
            client: Client::new(),
            url,
            bucket,
            service_role_key,
        })
    }

    /// Upload a file to Supabase Storage
    pub async fn upload_file(
        &self,
        participant_id: &str,
        file_name: &str,
        file_data: &[u8],
        content_type: &str,
    ) -> Result<String> {
        // Path format: {participant_id}/{file_name}
        let path = format!("{}/{}", participant_id, file_name);
        let upload_url = format!(
            "{}/storage/v1/object/{}/{}",
            self.url, self.bucket, path
        );

        let response = self
            .client
            .post(&upload_url)
            .header("Authorization", format!("Bearer {}", self.service_role_key))
            .header("Content-Type", content_type)
            .header("x-upsert", "true") // Allow overwriting existing files
            .body(file_data.to_vec())
            .send()
            .await
            .context("Failed to upload file to Supabase Storage")?;

        if !response.status().is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!(
                "Supabase Storage upload failed: {} - {}",
                response.status(),
                error_text
            );
        }

        // Return the public URL (or path)
        let public_url = format!(
            "{}/storage/v1/object/public/{}/{}",
            self.url, self.bucket, path
        );

        Ok(public_url)
    }

    /// Get a signed URL for a file (if needed)
    pub async fn get_signed_url(
        &self,
        participant_id: &str,
        file_name: &str,
        expires_in: u64,
    ) -> Result<String> {
        let path = format!("{}/{}", participant_id, file_name);
        let sign_url = format!(
            "{}/storage/v1/object/sign/{}/{}",
            self.url, self.bucket, path
        );

        let response = self
            .client
            .post(&sign_url)
            .header("Authorization", format!("Bearer {}", self.service_role_key))
            .query(&[("expires_in", expires_in.to_string())])
            .send()
            .await
            .context("Failed to get signed URL from Supabase Storage")?;

        if !response.status().is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!(
                "Supabase Storage signed URL failed: {} - {}",
                response.status(),
                error_text
            );
        }

        let signed_data: serde_json::Value = response
            .json()
            .await
            .context("Failed to parse signed URL response")?;

        let signed_path = signed_data
            .get("signedURL")
            .and_then(|v| v.as_str())
            .context("Missing signedURL in response")?;

        Ok(format!("{}{}", self.url, signed_path))
    }
}

