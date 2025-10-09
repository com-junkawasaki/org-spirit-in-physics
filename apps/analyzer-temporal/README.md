# Spirit Analysis Pipeline (Temporal Version)

This is a Temporal-based implementation of the Spirit in Physics analysis pipeline. It processes Hume AI emotion data and runs Kawasaki model analysis for quantitative measurement of spiritual responses through multimodal emotion analysis.

## Architecture

The pipeline is implemented using Temporal workflows and activities:

- **Workflow**: `SpiritAnalysisWorkflow` - Orchestrates the entire analysis pipeline
- **Activities**:
  - `EmotionAnalysisActivity` - Processes Hume AI emotion data
  - `KawasakiAnalysisActivity` - Runs Kawasaki model analysis with emotion integration
  - `ReportGenerationActivity` - Generates comprehensive analysis reports
  - `ResultSavingActivity` - Saves results and creates visualizations

## Features

- **Distributed Execution**: Workflows can be executed across multiple workers
- **Fault Tolerance**: Automatic retries and failure recovery
- **Monitoring**: Built-in workflow tracking and status monitoring
- **Scalability**: Horizontal scaling by adding more workers
- **Persistence**: Workflow state is persisted and can survive system restarts

## Prerequisites

1. **Temporal Server**: Running Temporal server (local or cloud)
2. **Python 3.8+**
3. **Supabase**: Database with Hume AI emotion data
4. **Dependencies**: Install required packages

## Setup

### 1. Install Dependencies

```bash
cd apps/analyzer-temporal
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
cd apps/analyzer-temporal
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

1. **Emotion Data Processing**: Extracts and analyzes emotion data from Hume AI
2. **Kawasaki Model Analysis**: Runs spiritual response analysis using emotion-integrated data
3. **Report Generation**: Creates comprehensive analysis reports
4. **Result Saving**: Saves all results and generates visualizations

## Output Files

The workflow generates the following output files:

- `hume_emotion_analysis.json` - Emotion analysis results
- `kawasaki_analysis.json` - Kawasaki model analysis results
- `analysis_report.md` - Comprehensive analysis report
- `hume_analysis_visualizations.html` - Interactive visualizations

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
