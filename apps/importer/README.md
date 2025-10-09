# Spirit in Physics - Importer

## Current Implementation: TerminusDB-based Data Import

This importer handles data collection and import operations using **TerminusDB** as the primary database. The system uses RDF graph database for flexible data modeling and complex relationship analysis.

## Architecture Overview

### Data Model (RDF Graph)
- **Participant**: Experiment participants with demographics
- **Consent**: Participant consent information
- **ExperimentSession**: Individual experiment sessions
- **ResponseData**: Participant responses with reaction times
- **WordStimulus**: Word stimuli used in experiments
- **HumeAnalysisJob**: Hume AI emotion analysis jobs
- **HumeLanguagePrediction**: Language analysis predictions
- **HumeBurstPrediction**: Burst emotion predictions
- **HumeProsodyPrediction**: Prosody analysis predictions

### Key Components

### 1. Data Import Scripts
- `import_to_terminusdb.py`: Import participant and session data from raw files
- `import_hume_data.py`: Import Hume AI emotion analysis results
- `import_hume_participants.py`: Import participant data from Hume jobs
- `import_response_data.py`: Import experiment response data
- `import_sessions_to_terminusdb.py`: Import session data from SQL dumps

### 2. Data Access Layer (`terminusdb_client.py`)
TerminusDB-based data operations using WOQL queries.

### 3. Hume AI Integration
- `run_hume_jobs.py`: Execute Hume AI emotion analysis jobs
- `src/pipeline/emotion_processor.py`: Hume AI API client
- `src/pipeline/hume_data_processor.py`: Process Hume AI results

### 4. Migration Tools
- `migrate_supabase_to_terminusdb.py`: Migrate data from Supabase to TerminusDB
- `terminusdb_client.py`: TerminusDB client for migration

### 5. Temporal Workflows (`src/activities/`)
Asynchronous processing workflows for Hume AI analysis.

## Setup

1. **Install Dependencies:**
   ```bash
   cd apps/importer
   pip install -r requirements.txt
   ```

2. **Configure TerminusDB:**
   Update `config.yaml` with TerminusDB connection details:
   ```yaml
   terminusdb:
     server_url: "http://localhost:6363"
     user: "admin"
     password: "root"
     database: "spirit_in_physics"
   ```

3. **Start TerminusDB:**
   ```bash
   docker run -d -p 6363:6363 --name terminusdb \
     -v $(pwd)/terminusdb_storage:/app/terminusdb/storage \
     terminusdb/terminusdb_server:latest
   ```

## Usage

### Import Raw Participant Data
```bash
python import_to_terminusdb.py
```

### Import Participant Data from Hume Jobs
```bash
python import_hume_participants.py
```

### Import Response Data
```bash
python import_response_data.py
```

### Import Session Data
```bash
python import_sessions_to_terminusdb.py
```

### Run Hume AI Analysis Jobs
```bash
python run_hume_jobs.py
```

### Import Hume AI Results
```bash
python import_hume_data.py
```

## Database Schema

### RDF Classes
- `Participant`: Basic participant information
- `Consent`: Consent records linked to participants
- `ExperimentSession`: Experiment sessions linked to participants
- `ResponseData`: Word association responses linked to participants and sessions
- `WordStimulus`: Word stimuli used in experiments
- `HumeAnalysisJob`: Hume AI job results linked to sessions
- `HumeLanguagePrediction`: Language analysis predictions
- `HumeBurstPrediction`: Burst emotion predictions
- `HumeProsodyPrediction`: Prosody analysis predictions

### Relationships (RDF Triples)
```
Participant → has_consent → Consent
Participant → has_session → ExperimentSession
Participant → has_response → ResponseData
ResponseData → belongs_to_session → ExperimentSession
ResponseData → uses_stimulus → WordStimulus
ExperimentSession → has_hume_analysis → HumeAnalysisJob
HumeAnalysisJob → has_language_prediction → HumeLanguagePrediction
HumeAnalysisJob → has_burst_prediction → HumeBurstPrediction
HumeAnalysisJob → has_prosody_prediction → HumeProsodyPrediction
```

## Integration with Analyzer

The importer works alongside the analyzer and visualizer apps:

- **Importer (TerminusDB)**: Data collection, storage, and preprocessing using RDF graph database
- **Analyzer (TerminusDB)**: Data analysis, modeling, and visualization using graph queries
- **Visualizer (TerminusDB)**: Web interface for data exploration and analysis results

All components share the same TerminusDB instance for unified data access.

## Hume AI Integration

### Job Execution
1. Videos are uploaded to dataset/participants/
2. `run_hume_jobs.py` submits videos to Hume AI
3. Results are stored as JSON in dataset/hume_data_organized/
4. `import_hume_data.py` loads results into TerminusDB as RDF triples

### Emotion Processing
- Face analysis for emotional expressions
- Prosody analysis for vocal emotions
- Language analysis for semantic content
- Integrated emotion scores for Spirit model using graph relationships

## Migration Path

The system includes migration tools for data compatibility:

```bash
# Migrate from Supabase to TerminusDB (if needed)
python migrate_supabase_to_terminusdb.py

# Import legacy SQL data
python import_sessions_to_terminusdb.py
```

The system is fully migrated to TerminusDB for graph-based data modeling and complex relationship analysis.
