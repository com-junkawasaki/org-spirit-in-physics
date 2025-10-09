# Spirit in Physics - Unified Temporal Analysis Pipeline

This is the unified Temporal-based implementation of the Spirit in Physics analysis pipeline, integrating advanced features from both @analyzer and @analyzer. It provides a complete, production-ready system for quantitative measurement of spiritual responses through multimodal emotion analysis.

## Architecture

The pipeline is implemented using Temporal workflows and activities with full integration of advanced analysis features:

- **Workflow**: `SpiritAnalysisWorkflow` - Orchestrates the entire analysis pipeline
- **Activities**:
  - `EmotionAnalysisActivity` - Processes Hume AI emotion data with comprehensive statistics
  - `KawasakiAnalysisActivity` - Runs advanced Kawasaki model with real experimental data
  - `ReportGenerationActivity` - Generates comprehensive analysis reports
  - `ResultSavingActivity` - Saves results and creates interactive visualizations

## Key Features

### Core Analysis Capabilities
- **Advanced Kawasaki Model**: Complete implementation with Word2Vec, reaction time, physiological, and emotion components
- **Hume AI Integration**: Face, prosody, and language emotion analysis with time-series processing
- **Real Data Processing**: Direct integration with Supabase database for experimental data
- **Interactive Visualizations**: 3D Spirit vector plots, component analysis, heatmaps, and time-series plots

### Production-Ready Features
- **Distributed Execution**: Workflows can be executed across multiple workers
- **Fault Tolerance**: Automatic retries and failure recovery with configurable policies
- **Monitoring**: Built-in workflow tracking and status monitoring via Temporal UI
- **Scalability**: Horizontal scaling by adding more workers
- **Persistence**: Workflow state survives system restarts and failures
- **REST API**: Complete HTTP API for external integrations

### Advanced Analysis Features
- **Word2Vec Integration**: Advanced trainer with emotional weighting and normalization
- **Emotion Integration**: Multi-modal emotion processing with statistical analysis
- **Physiological Data**: Skin potential time-series analysis with baseline correction
- **Confidence Intervals**: Statistical confidence calculation for Spirit probabilities
- **Parallel Processing**: Concurrent analysis of multiple responses

## Prerequisites

1. **Temporal Server**: Running Temporal server (local or cloud)
2. **Python 3.8+**
3. **Supabase**: Database with Hume AI emotion data
4. **Dependencies**: Install required packages

## Setup

### 1. Install Dependencies

```bash
cd apps/analyzer
pip install -r requirements.txt
```

### 2. Configure Temporal

Update `config.yaml` with your Temporal server settings:

```yaml
temporal:
  namespace: default
  task_queue: spirit-analysis-queue
  host: localhost:7233  # Or your Temporal server URL
```

### 3. Start Temporal Server (Local Development)

If you don't have a Temporal server running, you can start one locally:

```bash
# Using Docker
docker run -p 7233:7233 -p 8233:8233 temporalio/auto-setup:latest
```

### 4. Configure Supabase and Hume AI

Update the Supabase and Hume AI settings in `config.yaml`:

```yaml
supabase:
  url: "your-supabase-url"
  service_role_key: "your-service-role-key"

hume_ai:
  api_key: "your-hume-api-key"
```

## Usage

### Option 1: Direct Command Line Usage

#### 1. Start Worker

In one terminal, start the worker to execute workflows:

```bash
cd apps/analyzer
python worker.py
```

#### 2. Run Analysis

In another terminal, start the analysis workflow:

```bash
# Start analysis with default stimulus words
python client.py --start

# Start analysis with custom stimulus words
python client.py --start --stimulus-words head green water death mother

# Start analysis with custom output directory
python client.py --start --output-dir ./my-results
```

#### 3. Monitor Workflow

Check the status of your workflow:

```bash
# Check workflow status
python client.py --status spirit-analysis-12345678-1234-1234-1234-123456789012

# Get workflow results (when completed)
python client.py --result spirit-analysis-12345678-1234-1234-1234-123456789012
```

### Option 2: REST API Integration

The analyzer-temporal service provides a REST API for integration with the backend services.

#### Start API Server

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or run directly
python api_server.py --host 0.0.0.0 --port 8081
```

#### API Endpoints

The API server provides the following endpoints:

- `GET /health` - Health check
- `POST /api/workflows/start` - Start a new analysis workflow
- `GET /api/workflows/{workflow_id}/status` - Get workflow status
- `GET /api/workflows/{workflow_id}/result` - Get workflow results
- `DELETE /api/workflows/{workflow_id}` - Cancel a workflow

#### Example API Usage

```bash
# Start a workflow
curl -X POST http://localhost:8081/api/workflows/start \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "spirit-analysis-12345678-1234-1234-1234-123456789012",
    "sessionId": "session-uuid-here",
    "parameters": {
      "stimulus_words": ["head", "green", "water", "death", "mother"],
      "output_dir": "./results"
    }
  }'

# Check status
curl http://localhost:8081/api/workflows/spirit-analysis-12345678-1234-1234-1234-123456789012/status

# Get results
curl http://localhost:8081/api/workflows/spirit-analysis-12345678-1234-1234-1234-123456789012/result
```

## Workflow Execution Flow

1. **Emotion Data Processing**: Extracts and analyzes comprehensive emotion data from Hume AI (face, prosody, language)
2. **Real Data Integration**: Loads experimental responses, physiological data, and participant information from Supabase
3. **Advanced Feature Extraction**: Processes multi-modal data including Word2Vec vectors, reaction times, skin potential time-series, and emotion components
4. **Kawasaki Model Analysis**: Runs complete spiritual response analysis with normalization and confidence intervals
5. **Interactive Visualization**: Generates 3D Spirit vector plots, component analysis, probability heatmaps, and time-series visualizations
6. **Comprehensive Reporting**: Creates detailed Markdown reports with statistical summaries and analysis insights
7. **Result Persistence**: Saves all results, raw data, and visualizations to configured output directories

## Output Files

The unified workflow generates comprehensive output files in the configured results directory:

### Data Files
- `analysis_results.json` - Complete raw analysis results (emotion + Kawasaki data)
- `emotion_timeseries.json` - Detailed emotion time-series data from Hume AI
- `physiological_data.json` - Processed physiological measurements

### Reports
- `comprehensive_analysis_report.md` - Detailed Markdown report with statistical analysis
- `analysis_summary.json` - Executive summary with key metrics and insights

### Interactive Visualizations
- `spirit_vectors_3d.html` - 3D interactive plot of Spirit vectors in semantic space
- `component_analysis.html` - Breakdown of how each model component contributes to final probability
- `spirit_probability_heatmap.html` - Heatmap visualization of stimulus-response probabilities
- `physiological_timeseries.html` - Time-series plots of physiological and emotion data

### Advanced Analysis
- `confidence_intervals.json` - Statistical confidence intervals for Spirit probabilities
- `normalization_terms.json` - Normalization calculations for model validation
- `emotion_statistics.json` - Comprehensive emotion analysis statistics

## Configuration

### Model Parameters

Adjust the Kawasaki model parameters in `config.yaml`:

```yaml
model_params:
  alpha: 1.0      # Weight for reaction time component
  gamma: 1.0      # Weight for skin potential component
  eta: 1.0        # Weight for emotion component
  lambda: 1.0     # Scaling parameter for skin potential
  epsilon: 0.001  # Small constant to avoid division by zero
```

### Processing Options

Configure processing behavior:

```yaml
processing:
  max_concurrent_jobs: 3    # Maximum concurrent Hume AI jobs
  job_timeout_seconds: 600  # Job timeout (10 minutes)
  temp_dir: "/tmp/spirit-analysis-temporal"  # Temporary directory
```

## Development

### Adding New Activities

1. Create a new activity class in `activities/`
2. Define activity methods with `@activity.defn` decorator
3. Add the activity to the worker in `worker.py`
4. Update the workflow to call the new activity

### Customizing Workflows

Modify `workflows/spirit_analysis.py` to customize the analysis flow:

```python
@workflow.defn
class SpiritAnalysisWorkflow:
    @workflow.run
    async def run_analysis(self, stimulus_words=None, output_dir=None):
        # Add your custom steps here
        pass
```

## Troubleshooting

### Common Issues

1. **Temporal Server Connection**: Ensure Temporal server is running and accessible
2. **Supabase Connection**: Verify Supabase credentials and network connectivity
3. **Hume AI API**: Check API key and rate limits
4. **Worker Not Starting**: Check Python path and imports

### Logs

Check Temporal UI at http://localhost:8233 for workflow execution details and logs.

## Comparison with Original Analyzer

This Temporal version provides:

- **Better Reliability**: Fault tolerance and automatic retries
- **Scalability**: Distributed execution across multiple workers
- **Monitoring**: Built-in workflow tracking
- **Persistence**: Workflow state survives system restarts
- **Async Processing**: Non-blocking workflow execution

While maintaining full compatibility with the original analysis pipeline.
