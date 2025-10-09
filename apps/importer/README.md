# Spirit in Physics - Importer

## Current Implementation: Supabase-based Data Import

This importer handles data collection and import operations using **Supabase** as the primary database. The system is designed to work alongside the analyzer app, which uses TerminusDB for analysis operations.

## Architecture Overview

### Data Model (Relational)
- **participants**: Experiment participants with demographics
- **participant_consents**: Participant consent information
- **participant_experiment_sessions**: Individual experiment sessions
- **participant_response_data**: Participant responses with reaction times
- **video_files**: Video recordings from experiments
- **emotion_analyses**: Hume AI emotion analysis results
- **emotions**: Individual emotion predictions

### Key Components

### 1. Data Import Scripts
- `import_hume_data.py`: Import Hume AI emotion analysis results
- `import_hume_participants.py`: Import participant data
- `import_response_data.py`: Import experiment response data
- `import_to_supabase.py`: General Supabase import utilities

### 2. Data Access Layer (`src/pipeline/data_loader.py`)
Supabase-based data loading for experiment data.

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

2. **Configure Supabase:**
   Update `config.yaml` with Supabase connection details:
   ```yaml
   supabase:
     url: "https://your-project.supabase.co"
     service_role_key: "your-service-role-key"
   ```

## Usage

### Import Participant Data
```bash
python import_hume_participants.py
```

### Import Response Data
```bash
python import_response_data.py
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

### Core Tables
- `participants`: Basic participant information
- `participant_consents`: Consent records
- `participant_experiment_sessions`: Experiment sessions
- `participant_response_data`: Word association responses
- `video_files`: Video recordings metadata
- `emotion_analyses`: Hume AI job results
- `emotions`: Individual emotion predictions

### Relationships
```
participants → participant_consents
participants → participant_experiment_sessions
participants → participant_response_data
participant_response_data → participant_experiment_sessions
participant_experiment_sessions → emotion_analyses
emotion_analyses → emotions
```

## Integration with Analyzer

The importer works alongside the analyzer app:

- **Importer (Supabase)**: Data collection, storage, and preprocessing
- **Analyzer (TerminusDB)**: Data analysis, modeling, and visualization

Data flows from importer to analyzer through migration scripts when needed.

## Hume AI Integration

### Job Execution
1. Videos are uploaded to dataset/partners/
2. `run_hume_jobs.py` submits videos to Hume AI
3. Results are stored as JSON in dataset/hume_data_organized/
4. `import_hume_data.py` loads results into Supabase

### Emotion Processing
- Face analysis for emotional expressions
- Prosody analysis for vocal emotions
- Language analysis for semantic content
- Integrated emotion scores for Spirit model

## Migration Path

The system includes migration tools to move from Supabase to TerminusDB when needed:

```bash
python migrate_supabase_to_terminusdb.py
```

This enables future transition to graph database for complex relationship analysis.
