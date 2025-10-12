# Spirit in Physics - Analyzer

## ArangoDB Integration Complete

This analyzer has been fully integrated with **ArangoDB**, a powerful multi-model database providing both document storage and graph capabilities.

## Key Features

### Configuration (`config.yaml`)
- **ArangoDB**: URL, user, password, and database name
- **Hume AI**: API key for emotion analysis
- **Model Parameters**: Kawasaki model coefficients
- **Word2Vec**: Model path and processing settings

### Dependencies (`requirements.txt`)
- `python-arango`: ArangoDB Python client
- `numpy`, `pandas`: Data processing
- `plotly`: Visualization
- `hume`: Hume AI API client

### Data Access (`src/pipeline/data_loader.py`)
- **AQL Queries**: ArangoDB Query Language for efficient data retrieval
- **Multi-collection joins**: Participant sessions, responses, and stimuli
- **Emotion data loading**: Skin potential and emotion timeseries

### Data Storage (`src/pipeline/data_storer.py`)
- **Document collections**: `analysis_runs`, `analysis_results`
- **Emotion data updates**: Response documents with emotion JSON
- **Analysis results**: P-values and component breakdowns

## AQL Query Examples

### Get Unprocessed Responses
```python
aql_query = f"""
FOR response IN participant_session_responses
    LIMIT {limit}
    RETURN response
"""
```

### Store Analysis Results
```python
doc = {
    "_key": f"{response_id}_{run_id}",
    "id": f"{response_id}_{run_id}",
    "run_id": run_id,
    "response_id": response_id,
    "p_value": p_value,
    "word2vec_component": components.get('word2vec', 0.0),
    "reaction_time_component": components.get('reaction_time', 0.0),
    "skin_potential_component": components.get('skin_potential', 0.0),
    "emotion_component": components.get('emotion', 0.0),
    "created_at": timestamp
}
```

### Get Experiment Session for Response
```python
aql_query = """
FOR response IN participant_session_responses
    FILTER response.id == @response_id
    FOR session IN participant_sessions
        FILTER session.id == response.experiment_id
        RETURN {
            id: session.id,
            session_type: session.session_type,
            start_time: session.start_time,
            end_time: session.end_time
        }
"""
```

## ArangoDB Benefits

1. **Multi-Model Database**: Documents, graphs, and key-value operations
2. **AQL Queries**: Powerful query language for complex data operations
3. **Horizontal Scaling**: Distributed architecture for large datasets
4. **ACID Transactions**: Reliable data consistency
5. **Graph Traversals**: Efficient relationship analysis for Spirit correlations

## Pipeline Components

### Core Processing
- **DataLoader**: Loads participant responses and session data
- **EmotionProcessor**: Handles Hume AI emotion analysis
- **FeatureExtractor**: Extracts word2vec, reaction time, and physiological features
- **KawasakiModel**: Computes Spirit probability using integrated components
- **DataStorer**: Saves analysis results to ArangoDB

### Visualization
- **SpiritVisualizer**: Generates interactive plots and reports
- **Component Analysis**: Word2Vec, reaction time, skin potential correlations
- **Participant Comparisons**: Individual and group-level analysis

## Usage

```bash
# Install dependencies
pip install -r requirements.txt

# Run analysis
python src/main.py --model-version v1.0 --notes "Initial ArangoDB integration"

# Generate visualizations
python visualize_results.py
```

## Data Collections

- `participants`: Participant demographics
- `participant_sessions`: Experiment sessions
- `participant_session_responses`: Word association responses
- `word_stimuli`: Stimulus words
- `analysis_runs`: Analysis execution records
- `analysis_results`: Detailed analysis results with components