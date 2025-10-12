# Spirit in Physics - Importer

This application is responsible for importing all raw experimental data into the ArangoDB database. It handles data from various sources, including participant consent forms, session data, and Hume AI analysis results.

## Architecture

The importer is the single source of truth for data ingestion. It uses a shared pipeline library located in `packages/spirit_in_physics_pipeline` for core data handling functionalities like database connections and data models.

## Key Components

- **Import Scripts**: A collection of scripts in the root directory (`import_*.py`) for importing different types of data (participants, responses, Hume data).
- **Temporal Workflows**: The `src` directory contains Temporal workflows and activities for orchestrating complex, long-running ingestion processes, such as processing media files with Hume AI.
- **Shared Pipeline**: It relies on `packages/spirit_in_physics_pipeline` for database interactions (`arangodb_client`, `data_storer`, `data_loader`) and other core logic.

## Setup

1.  **Install Dependencies**:
    Make sure you have a virtual environment set up and the requirements are installed:
    ```bash
    source venv/bin/activate
    pip install -r requirements.txt
    ```

2.  **Configure ArangoDB**:
    Update `config.yaml` with your ArangoDB connection details.

3.  **Start ArangoDB**:
    Ensure your ArangoDB instance is running.

## Usage

### Import All Participant Data

To import all participant data from the `dataset/participants/` directory into ArangoDB, run the following command from the project root:

```bash
python apps/importer/import_to_arangodb.py
```

### Running Hume AI Jobs

To process video files with Hume AI, you can use the `run_hume_jobs.py` script:

```bash
python apps/importer/run_hume_jobs.py
```

### Temporal Workflows

To run the Temporal-based ingestion workflows, you need to have a Temporal server running. Then you can start the worker and trigger workflows:

1.  **Start the Worker**:
    ```bash
    python -m apps.importer.src.run_worker
    ```

2.  **Start an Ingestion Workflow**:
    ```bash
    python -m apps.importer.src.start_ingestion --session-id <your_session_id>
    ```
