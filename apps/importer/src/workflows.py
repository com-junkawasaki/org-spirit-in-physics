from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy
import asyncio

with workflow.unsafe.imports_passed_through():
    from activities.arangodb_activities import ArangoDBActivities
    from activities.hume_activities import HumeActivities

arango_activities = workflow.new_activity_stub(
    ArangoDBActivities,
    start_to_close_timeout=timedelta(minutes=5),
    retry_policy=RetryPolicy(
        initial_interval=timedelta(seconds=1),
        maximum_interval=timedelta(minutes=1),
        maximum_attempts=3,
    ),
)

hume_activities = workflow.new_activity_stub(
    HumeActivities,
    start_to_close_timeout=timedelta(minutes=30),
    retry_policy=RetryPolicy(
        initial_interval=timedelta(seconds=5),
        maximum_interval=timedelta(minutes=5),
        maximum_attempts=5,
    ),
)

# Activities will be called directly in the workflow

@workflow.defn
class IngestionWorkflow:
    @workflow.run
    async def run(self, session_id: str) -> dict:
        """Execute ingestion workflow with comprehensive error handling."""
        workflow.set_search_attribute("sessionId", session_id)
        workflow.logger.info(f"Starting ingestion workflow for session: {session_id}")
        
        local_path = ""
        hume_job_id = None
        
        try:
            # Step 1: Get session information
            workflow.logger.info(f"Step 1: Getting session information for {session_id}")
            session_info = await arango_activities.get_session_for_ingestion(session_id)
            
            # Step 2: Download media file
            workflow.logger.info(f"Step 2: Downloading media file for {session_id}")
            local_path = await arango_activities.download_media_file(session_info["storage_path"])

            # Step 3: Submit job to Hume AI
            workflow.logger.info(f"Step 3: Submitting job to Hume AI for {session_id}")
            hume_job_id = await hume_activities.submit_job_to_hume(local_path)
            
            # Step 4: Poll and fetch Hume results
            workflow.logger.info(f"Step 4: Polling Hume job {hume_job_id} for completion")
            artifacts = await hume_activities.poll_and_fetch_hume_results(hume_job_id)
            
            # Step 5: Validate Hume results
            workflow.logger.info(f"Step 5: Validating Hume results for {session_id}")
            validation_result = await hume_activities.validate_hume_results(artifacts)
            if not validation_result:
                raise ValueError(f"Hume results validation failed for session {session_id}")

            # Step 6: Store raw Hume data
            workflow.logger.info(f"Step 6: Storing raw Hume data for {session_id}")
            await arango_activities.store_raw_hume_data((session_id, artifacts))
            
            # Step 7: Parse and store structured data
            workflow.logger.info(f"Step 7: Parsing and storing structured data for {session_id}")
            await arango_activities.parse_and_store_structured_data((session_id, artifacts))

            # Step 8: Update session status to complete
            workflow.logger.info(f"Step 8: Updating session status to COMPLETE for {session_id}")
            await arango_activities.update_session_status((session_id, "INGESTION_COMPLETE"))

            workflow.logger.info(f"Ingestion workflow completed successfully for session: {session_id}")
            return {
                "status": "SUCCESS", 
                "sessionId": session_id,
                "hume_job_id": hume_job_id,
                "artifacts_count": len(artifacts) if artifacts else 0
            }

        except Exception as e:
            workflow.logger.error(f"Ingestion workflow failed for session {session_id}: {e}")
            
            # Update session status to failed
            try:
                await arango_activities.update_session_status((session_id, "INGESTION_FAILED"))
            except Exception as status_error:
                workflow.logger.error(f"Failed to update session status: {status_error}")
            
            # Return error information
            return {
                "status": "FAILED",
                "sessionId": session_id,
                "error": str(e),
                "hume_job_id": hume_job_id
            }

        finally:
            # Cleanup temporary files
            if local_path:
                try:
                    workflow.logger.info(f"Cleaning up temporary file: {local_path}")
                    await arango_activities.cleanup_temp_files(local_path)
                except Exception as cleanup_error:
                    workflow.logger.error(f"Failed to cleanup temporary file: {cleanup_error}")

@workflow.defn
class BatchIngestionWorkflow:
    """Workflow for processing multiple sessions in batch."""
    
    @workflow.run
    async def run(self, session_ids: list[str]) -> dict:
        """Process multiple sessions in parallel with error handling."""
        workflow.logger.info(f"Starting batch ingestion for {len(session_ids)} sessions")
        
        results = []
        failed_sessions = []
        
        # Process sessions in parallel
        async def process_session(session_id: str):
            try:
                result = await workflow.execute_child_workflow(
                    IngestionWorkflow.run,
                    session_id,
                    id=f"ingestion-{session_id}",
                    task_queue="importer-task-queue"
                )
                return result
            except Exception as e:
                workflow.logger.error(f"Child workflow failed for {session_id}: {e}")
                return {"status": "FAILED", "sessionId": session_id, "error": str(e)}
        
        # Execute all sessions in parallel
        tasks = [process_session(session_id) for session_id in session_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        successful_count = 0
        for result in results:
            if isinstance(result, Exception):
                workflow.logger.error(f"Task failed with exception: {result}")
                failed_sessions.append({"error": str(result)})
            elif result.get("status") == "SUCCESS":
                successful_count += 1
            else:
                failed_sessions.append(result)
        
        workflow.logger.info(f"Batch ingestion completed: {successful_count} successful, {len(failed_sessions)} failed")
        
        return {
            "status": "COMPLETED",
            "total_sessions": len(session_ids),
            "successful_count": successful_count,
            "failed_count": len(failed_sessions),
            "failed_sessions": failed_sessions
        }


@workflow.defn
class PipelineOrchestrator:
    """Orchestrates the entire data processing pipeline with dependency management."""
    
    @workflow.run
    async def run(self, session_ids: list[str]) -> dict:
        """Execute the complete pipeline: ingestion -> analysis -> visualization."""
        workflow.logger.info(f"Starting pipeline orchestration for {len(session_ids)} sessions")
        
        try:
            # Step 1: Execute ingestion workflows in parallel
            workflow.logger.info("Step 1: Executing ingestion workflows")
            ingestion_tasks = []
            for session_id in session_ids:
                task = workflow.execute_child_workflow(
                    IngestionWorkflow.run,
                    session_id,
                    id=f"ingestion-{session_id}",
                    task_queue="importer-task-queue"
                )
                ingestion_tasks.append(task)
            
            # Wait for all ingestion workflows to complete
            ingestion_results = await asyncio.gather(*ingestion_tasks, return_exceptions=True)
            
            # Check ingestion results
            successful_ingestions = []
            failed_ingestions = []
            for i, result in enumerate(ingestion_results):
                if isinstance(result, Exception):
                    failed_ingestions.append({"session_id": session_ids[i], "error": str(result)})
                elif result.get("status") == "SUCCESS":
                    successful_ingestions.append(result)
                else:
                    failed_ingestions.append(result)
            
            workflow.logger.info(f"Ingestion completed: {len(successful_ingestions)} successful, {len(failed_ingestions)} failed")
            
            return {
                "status": "SUCCESS",
                "ingestion_results": {
                    "successful": successful_ingestions,
                    "failed": failed_ingestions,
                    "total": len(session_ids)
                },
            }
            
        except Exception as e:
            workflow.logger.error(f"Pipeline orchestration failed: {e}")
            return {
                "status": "FAILED",
                "error": str(e),
                "total_sessions": len(session_ids)
            }
