# Spirit in Physics - Importer

## Current Implementation: ArangoDB-based Data Import

This importer handles data collection and import operations using **ArangoDB** as the primary multi-model database. ArangoDB provides both document storage capabilities and graph database features for complex relationship analysis.

## Architecture Overview

### Data Model (Multi-Model)
- **participants**: Experiment participants with demographics (Document Collection)
- **participant_sessions**: Individual experiment sessions (Document Collection)
- **participant_session_responses**: Participant responses with reaction times (Document Collection)
- **word_stimuli**: Word association stimuli (Document Collection)
- **analysis_runs**: Analysis execution records (Document Collection)
- **analysis_results**: Analysis results and findings (Document Collection)

### Key Components

### 1. Core Import Script
- `import_to_arangodb.py`: Unified ArangoDB import script for all participant data
- `arangodb_client.py`: ArangoDB client with AQL query support

### 2. Data Access Layer (`src/pipeline/data_loader.py`)
ArangoDB-based data loading for experiment data with AQL queries.

### 3. Hume AI Integration
- `run_hume_jobs.py`: Execute Hume AI emotion analysis jobs
- `src/pipeline/emotion_processor.py`: Hume AI API client
- `src/pipeline/hume_data_processor.py`: Process Hume AI results

### 4. Temporal Workflows (`src/activities/`)
Asynchronous processing workflows for Hume AI analysis using ArangoDB.

## Setup

1. **Install Dependencies:**
   ```bash
   cd apps/importer
   pip install -r requirements.txt
   ```

2. **Configure ArangoDB:**
   Update `config.yaml` with ArangoDB connection details:
   ```yaml
   arangodb:
     url: "http://localhost:8529"
     user: "root"
     password: ""
     database: "spirit_in_physics"
   ```

3. **Start ArangoDB:**
   ```bash
   docker run -p 8529:8529 -e ARANGO_ROOT_PASSWORD="" arangodb/arangodb:3.11
   ```

## Usage

### Import All Participant Data
```bash
python import_to_arangodb.py
```

This script imports all participant data from `../../dataset/participants/` into ArangoDB.

### Run Hume AI Analysis Jobs
```bash
python run_hume_jobs.py
```

### Test ArangoDB Connection
```bash
python arangodb_client.py
```

## Database Schema

### Core Collections
- `participants`: Basic participant information
- `participant_sessions`: Experiment sessions
- `participant_session_responses`: Word association responses with reaction times
- `word_stimuli`: Word stimuli used in experiments
- `analysis_runs`: Analysis execution records
- `analysis_results`: Analysis results and findings

### Data Relationships
ArangoDB supports both document queries and graph traversals for complex relationship analysis.

## Integration with Analyzer

The importer provides data to the analyzer app:

- **Importer (ArangoDB)**: Data collection, storage, and preprocessing
- **Analyzer**: Data analysis, modeling, and visualization using ArangoDB data

## Hume AI Integration

### Job Execution
1. Videos are uploaded to dataset/participants/
2. `run_hume_jobs.py` submits videos to Hume AI
3. Results are processed and can be integrated into ArangoDB
4. Emotion data enhances the Spirit analysis model

### Emotion Processing
- Face analysis for emotional expressions
- Prosody analysis for vocal emotions
- Language analysis for semantic content
- Integrated emotion scores for Spirit model

## ArangoDB Benefits

ArangoDB provides:
- **Multi-model database**: Documents, graphs, and key-value operations
- **AQL queries**: Powerful query language for complex data operations
- **Horizontal scaling**: Distributed architecture for large datasets
- **ACID transactions**: Reliable data consistency
- **Graph traversals**: Efficient relationship analysis for Spirit correlations
