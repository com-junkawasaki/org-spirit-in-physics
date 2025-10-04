# Spirit in Physics - Analysis Pipeline

This directory contains the data analysis pipeline for the "Spirit in Physics" project. It is designed to process the raw experimental data collected by the Next.js application (`v250730`) and apply the Kawasaki Model to quantify the "spirit".

## Domain Model

The pipeline operates on the following core domain concepts:

-   **Participant**: The subject of the experiment.
-   **Stimulus (`w_I`)**: The input word presented to the participant.
-   **Response (`w_O`)**: The word spoken by the participant in reaction to the stimulus.
-   **Reaction Time (`T`)**: The time taken to respond.
-   **Skin Potential (`SP`)**: A measure of physiological arousal, captured as a time-series.
-   **Emotion (`F`)**: Facial and vocal emotional expression, captured as a time-series from services like Hume AI.
-   **Spirit Vector (`P(w_O|w_I)`)**: The final calculated probability representing the relationship between stimulus and response, incorporating all the above factors.

## Workflow

The analysis pipeline is designed as a series of sequential steps:

1.  **Data Ingestion**:
    -   Fetch raw experimental data (responses, reaction times, file paths) from the Supabase `participant_response_data` table.
    -   Download corresponding video and audio files from Supabase Storage.

2.  **Emotion Analysis**:
    -   Submit the downloaded video/audio files to the Hume AI API.
    -   Receive and parse the time-series emotion data.
    -   Store this rich time-series data in the `response_emotion_timeseries` table.

3.  **Preprocessing & Feature Extraction**:
    -   Load skin potential data (assuming it's ingested into `response_skin_potential_timeseries`).
    -   Align the emotion and skin potential time-series with the stimulus-response event window.
    -   Calculate the aggregate features required by the Kawasaki model:
        -   `r(w_I, w_O)` from reaction time.
        -   `ΔSP(w_I, w_O)` from the skin potential time-series.
        -   `F(w_I, w_O)` as an integrated score from the emotion time-series.

4.  **Model Calculation**:
    -   Load a pre-trained Word2Vec model.
    -   For each response, feed the extracted features (`r`, `ΔSP`, `F`) and word vectors (`w_I`, `w_O`) into the Kawasaki Model formula.
    -   Calculate the final probability `P(w_O | w_I)`.

5.  **Storage**:
    -   Create a new entry in the `analysis_runs` table to log the pipeline execution, its version, and parameters.
    -   Store the final probability and all intermediate components in the `analysis_results` table, linking back to the analysis run and the original response data.

## Setup

1.  **Install Python dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
2.  **Configure Environment**:
    -   Copy `config.example.yaml` to `config.yaml`.
    -   Fill in your Supabase project URL, service role key, and Hume AI API key.
    -   Ensure your Hume AI API key has access to Expression Measurement endpoints.

3.  **Run Pipeline**:
    ```bash
    python src/main.py --model-version "1.0-alpha" --notes "Initial test run with default parameters."
    ```

## Hume AI Integration

The pipeline integrates with Hume AI's Expression Measurement API to analyze facial expressions, vocal emotions, and language content from participant videos and audio recordings.

### Supported Media Types
- **Video files**: `.mp4`, `.avi`, `.mov`, `.webm` - Analyzes facial expressions, vocal prosody, and spoken language
- **Audio files**: `.mp3`, `.wav`, `.m4a`, `.flac` - Analyzes vocal prosody and spoken language

### Emotion Models Used
- **Face**: Facial expression analysis (joy, sadness, anger, fear, disgust, surprise)
- **Prosody**: Vocal emotion analysis from speech patterns
- **Language**: Semantic emotion analysis from spoken content
- **Burst**: Emotion intensity bursts
- **NER**: Named entity recognition

### Data Flow
1. Downloads media files from Supabase Storage
2. Submits to Hume AI batch processing API
3. Waits for asynchronous job completion
4. Parses time-series emotion predictions
5. Stores emotion data in `response_emotion_timeseries` table
6. Uses emotion data for feature extraction in Kawasaki Model

## Schema

The pipeline uses and populates a set of analysis-specific tables in the Supabase database. These are defined in the migration file `.../supabase/migrations/20241004000004_analysis_schema.sql`.

-   `analysis_runs`: Logs each pipeline execution.
-   `response_skin_potential_timeseries`: Stores raw skin potential time-series.
-   `response_emotion_timeseries`: Stores Hume AI emotion output.
-   `analysis_results`: Stores the final calculated vectors and model components.
