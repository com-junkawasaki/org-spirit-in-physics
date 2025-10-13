from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from .activities import generate_visualizations, run_analysis_pipeline

# Define retry policies for analyzer activities
analysis_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    maximum_interval=timedelta(minutes=2),
    maximum_attempts=3,
    backoff_coefficient=2.0,
    non_retryable_error_types=["ValueError", "FileNotFoundError"]
)

visualization_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    maximum_interval=timedelta(minutes=1),
    maximum_attempts=2,
    backoff_coefficient=2.0,
    non_retryable_error_types=["ValueError"]
)

@workflow.defn
class VisualizationWorkflow:
    @workflow.run
    async def run(self, run_id: str, config: dict) -> str:
        """Executes the visualization generation workflow with error handling."""
        workflow.logger.info(f"Starting visualization workflow for run: {run_id}")
        
        try:
            result = await workflow.execute_activity(
                generate_visualizations,
                (run_id, config),
                start_to_close_timeout=timedelta(minutes=15),
                retry_policy=visualization_retry_policy
            )
            
            workflow.logger.info(f"Visualization workflow completed successfully for run: {run_id}")
            return result
            
        except Exception as e:
            workflow.logger.error(f"Visualization workflow failed for run {run_id}: {e}")
            return f"Visualization generation failed: {str(e)}"

@workflow.defn
class AnalysisWorkflow:
    @workflow.run
    async def run(self, model_version: str, notes: str, config: dict) -> str:
        """Executes the main analysis pipeline workflow with error handling."""
        workflow.logger.info(f"Starting analysis workflow for model version: {model_version}")
        
        try:
            result = await workflow.execute_activity(
                run_analysis_pipeline,
                (model_version, notes, config),
                start_to_close_timeout=timedelta(hours=2),
                retry_policy=analysis_retry_policy
            )
            
            workflow.logger.info(f"Analysis workflow completed successfully for model version: {model_version}")
            return result
            
        except Exception as e:
            workflow.logger.error(f"Analysis workflow failed for model version {model_version}: {e}")
            return f"Analysis pipeline failed: {str(e)}"

@workflow.defn
class IntegratedAnalysisWorkflow:
    """Integrated workflow that runs analysis and visualization together."""
    
    @workflow.run
    async def run(self, model_version: str, notes: str, config: dict) -> dict:
        """Execute analysis followed by visualization with error handling."""
        workflow.logger.info(f"Starting integrated analysis workflow for model version: {model_version}")
        
        try:
            # Step 1: Run analysis pipeline
            workflow.logger.info("Step 1: Running analysis pipeline")
            analysis_result = await workflow.execute_activity(
                run_analysis_pipeline,
                (model_version, notes, config),
                start_to_close_timeout=timedelta(hours=2),
                retry_policy=analysis_retry_policy
            )
            
            # Extract run_id from analysis result
            run_id = self._extract_run_id(analysis_result)
            if not run_id:
                raise ValueError("Could not extract run_id from analysis result")
            
            workflow.logger.info(f"Analysis completed with run_id: {run_id}")
            
            # Step 2: Generate visualizations
            workflow.logger.info("Step 2: Generating visualizations")
            visualization_result = await workflow.execute_activity(
                generate_visualizations,
                (run_id, config),
                start_to_close_timeout=timedelta(minutes=15),
                retry_policy=visualization_retry_policy
            )
            
            workflow.logger.info(f"Integrated analysis workflow completed successfully")
            
            return {
                "status": "SUCCESS",
                "run_id": run_id,
                "analysis_result": analysis_result,
                "visualization_result": visualization_result
            }
            
        except Exception as e:
            workflow.logger.error(f"Integrated analysis workflow failed: {e}")
            return {
                "status": "FAILED",
                "error": str(e),
                "model_version": model_version
            }
    
    def _extract_run_id(self, analysis_result: str) -> str:
        """Extract run_id from analysis result string."""
        try:
            # Look for "Run ID: " pattern in the result
            if "Run ID:" in analysis_result:
                parts = analysis_result.split("Run ID:")
                if len(parts) > 1:
                    run_id_part = parts[1].split(",")[0].strip()
                    return run_id_part
            return None
        except Exception:
            return None