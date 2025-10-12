from datetime import timedelta
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from .activities import generate_visualizations

@workflow.defn
class VisualizationWorkflow:
    @workflow.run
    async def run(self, run_id: str, config: dict) -> str:
        """Executes the visualization generation workflow."""
        return await workflow.execute_activity(
            generate_visualizations,
            (run_id, config),
            start_to_close_timeout=timedelta(minutes=15),
        )
