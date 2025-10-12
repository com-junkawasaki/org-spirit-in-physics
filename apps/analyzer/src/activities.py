import sys
import os
from temporalio import activity

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from apps.analyzer.visualize_results import VisualizationGenerator

@activity.defn
async def generate_visualizations(run_id: str, config: dict) -> str:
    """Activity to generate visualizations for a given run_id."""
    activity.logger.info(f"Generating visualizations for run_id: {run_id}")
    visualizer = VisualizationGenerator(config)
    if visualizer.connect():
        try:
            visualizer.generate_all(run_id)
            return f"Successfully generated visualizations for run_id: {run_id}"
        finally:
            visualizer.client.close()
    else:
        return f"Failed to connect to ArangoDB for run_id: {run_id}"
