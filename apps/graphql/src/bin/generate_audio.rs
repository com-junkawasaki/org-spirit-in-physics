use std::fs;
use std::path::Path;
use std::collections::HashMap;
use async_openai::{Client, types::{CreateSpeechRequest, Voice, SpeechModel}};
use graphql::constants::{JUNG_STIMULUS_WORDS, JUNG_TEST_WELCOME_MESSAGE}; // Assuming your crate name is 'graphql'

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let output_dir = Path::new("../participant/public/audio/jung-voice-assessment");
    fs::create_dir_all(output_dir)?;

    let client = Client::new();

    async fn text_to_speech(client: &Client, text: &str, file_name: &str, output_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
        let file_path = output_dir.join(format!("{}.mp3", file_name));
        if file_path.exists() {
            println!("Skipping: {}.mp3 already exists.", file_name);
            return Ok(());
        }

        println!("Generating audio for: {}...", &text[..std::cmp::min(text.len(), 20)]);

        let request = CreateSpeechRequest {
            model: SpeechModel::Tts1,
            input: text.to_string(),
            voice: Voice::Alloy,
            ..Default::default()
        };

        let response = client.audio().speech(request).await?;
        response.save(&file_path).await?;
        println!("Successfully created: {}.mp3", file_name);
        Ok(())
    }

    // Generate welcome message audio
    text_to_speech(&client, JUNG_TEST_WELCOME_MESSAGE.trim(), "welcome_message", output_dir).await?;

    // Generate audio for each stimulus word
    for (key, word) in JUNG_STIMULUS_WORDS.iter() {
        text_to_speech(&client, word.pronunciation, &key.to_string(), output_dir).await?;
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await; // To avoid rate limiting
    }

    println!("All audio files generation process completed.");

    Ok(())
}
