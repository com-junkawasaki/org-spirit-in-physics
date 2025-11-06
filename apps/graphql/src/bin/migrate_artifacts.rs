use std::fs;
use std::path::{Path, PathBuf};
use vercel_blob::{BlobClient, PutRequest, BlobAccess};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let artifacts_dir = Path::new(".artifacts_cache");
    if !artifacts_dir.exists() {
        eprintln!("❌ .artifacts_cache directory not found");
        return Err("Artifacts directory not found".into());
    }

    let blob_client = BlobClient::new()?;
    let mut total_files = 0;
    let mut total_errors = 0;

    println!("🚀 Starting artifact migration to Vercel Blob Storage...\n");

    for entry in fs::read_dir(artifacts_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let participant_id = path.file_name().unwrap().to_str().unwrap();
            println!("\n👤 Migrating participant: {}", participant_id);
            
            for file_entry in fs::read_dir(&path)? {
                let file_entry = file_entry?;
                let file_path = file_entry.path();
                if file_path.is_file() {
                    let file_name = file_path.file_name().unwrap().to_str().unwrap();
                    let file_content = fs::read(&file_path)?;

                    let put_request = PutRequest::new(format!("{}/{}", participant_id, file_name))
                        .body(file_content)
                        .access(BlobAccess::Public);

                    match blob_client.put(put_request).await {
                        Ok(_) => {
                            println!("✓ Migrated {}/{}", participant_id, file_name);
                            total_files += 1;
                        }
                        Err(e) => {
                            eprintln!("✗ Failed to migrate {}: {}", file_name, e);
                            total_errors += 1;
                        }
                    }
                }
            }
        }
    }

    println!("\n📊 Migration Summary:");
    println!("{}", "=".repeat(50));
    println!("📈 Total files migrated: {}", total_files);
    println!("⚠️  Total errors: {}", total_errors);

    if total_errors == 0 {
        println!("\n✅ Migration completed successfully!");
    } else {
        println!("\n⚠️  Migration completed with some errors. Please review the errors above.");
    }

    Ok(())
}
