use vercel_blob::{BlobClient, PutRequest};
use std::env;

pub async fn upload_to_blob_storage(file_name: &str, file_content: Vec<u8>) -> Result<String, Box<dyn std::error::Error>> {
    let blob_client = BlobClient::new()?;
    let put_request = PutRequest::new(file_name)
        .body(file_content)
        .access(vercel_blob::BlobAccess::Public);
    let blob = blob_client.put(put_request).await?;
    Ok(blob.url)
}

pub async fn download_from_blob_storage(blob_url: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let res = client.get(blob_url).send().await?;
    let bytes = res.bytes().await?;
    Ok(bytes.to_vec())
}
