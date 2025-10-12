# Spirit in Physics - Analyzer

This application is responsible for analyzing the data collected by the `importer` and running the Kawasaki model to calculate Spirit probabilities.

## Architecture

The analyzer now uses a shared pipeline library located in `packages/spirit_in_physics_pipeline`, which contains the core logic for data loading, feature extraction, and the Kawasaki model. This ensures that the analysis logic is centralized and consistent.

## Key Features

- **Data Analysis**: Runs the Kawasaki model on data stored in ArangoDB.
- **Visualization**: Generates various plots and HTML reports to visualize the analysis results.
- **Configuration-driven**: All parameters for the model, database, and other services are managed through `config.yaml`.

## Usage

1.  **Ensure Dependencies are Installed**:
    Make sure you have a virtual environment set up and the requirements are installed:
    ```bash
    source venv/bin/activate
    pip install -r requirements.txt
    ```

2.  **Run Analysis**:
    To run the main analysis pipeline, execute the following command from the project root:
    ```bash
    python -m apps.analyzer.src.main --model-version <version> --notes "<your_notes>"
    ```

3.  **Generate Visualizations**:
    After an analysis run, you can generate visualizations:
    ```bash
    python -m apps.analyzer.visualize_results
    ```

This will use the latest analysis results to generate plots and an HTML report in the `apps/analyzer` directory.