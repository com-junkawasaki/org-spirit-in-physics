from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy
import asyncio

with workflow.unsafe.imports_passed_through():
    from ..activities.arangodb_activities import ArangoDBActivities
    from ..activities.hume_activities import HumeActivities
    from ..activities.analysis_activities import AnalysisActivities
    from ..activities.visualization_activities import VisualizationActivities

# Define activity stubs with timeouts and retry policies
arango_activities = workflow.new_activity_stub(
    ArangoDBActivities,
    start_to_close_timeout=timedelta(minutes=5),
    retry_policy=RetryPolicy(maximum_attempts=3)
)

hume_activities = workflow.new_activity_stub(
    HumeActivities,
    start_to_close_timeout=timedelta(minutes=30),
    retry_policy=RetryPolicy(maximum_attempts=5)
)

analysis_activities = workflow.new_activity_stub(
    AnalysisActivities,
    start_to_close_timeout=timedelta(hours=2),
    retry_policy=RetryPolicy(maximum_attempts=3)
)

visualization_activities = workflow.new_activity_stub(
    VisualizationActivities,
    start_to_close_timeout=timedelta(minutes=15),
    retry_policy=RetryPolicy(maximum_attempts=2)
)

@workflow.defn
class IngestionWorkflow:
    @workflow.run
    async def run(self, session_id: str) -> dict:
        # (Same as the original IngestionWorkflow)
        pass # Placeholder for the original IngestionWorkflow logic

@workflow.defn
class UnifiedPipelineWorkflow:
    @workflow.run
    async def run(self, session_ids: list[str], model_version: str, notes: str, config: dict) -> dict:
        workflow.logger.info(f"Starting unified pipeline for {len(session_ids)} sessions")
        
        # Step 1: Ingestion
        ingestion_tasks = [workflow.execute_child_workflow(
            IngestionWorkflow.run, session_id, id=f"ingestion-{session_id}"
        ) for session_id in session_ids]
        ingestion_results = await asyncio.gather(*ingestion_tasks, return_exceptions=True)
        
        successful_ingestions = [res for res in ingestion_results if not isinstance(res, Exception) and res.get("status") == "SUCCESS"]
        
        if not successful_ingestions:
            return {"status": "FAILED", "reason": "All ingestions failed", "results": ingestion_results}

        # Step 2: Analysis
        analysis_result = await analysis_activities.run_analysis_pipeline(model_version, notes, config)
        run_id = analysis_result.get("run_id")

        if not run_id:
            return {"status": "FAILED", "reason": "Analysis did not return a run_id", "analysis_result": analysis_result}

        # Step 3: Visualization
        visualization_result = await visualization_activities.generate_visualizations(run_id, config)

        return {
            "status": "SUCCESS",
            "ingestion_results": ingestion_results,
            "analysis_result": analysis_result,
            "visualization_result": visualization_result,
        }
