"""
Import workflows for the importer app.
This file contains the actual workflow implementations.
"""
from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from ..activities.arangodb import ArangoDBActivities
    from ..activities.hume_activities import HumeActivities

# Define retry policies for different activity types
arangodb_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    maximum_interval=timedelta(minutes=1),
    maximum_attempts=3,
    backoff_coefficient=2.0,
    non_retryable_error_types=["ValueError", "FileNotFoundError"]
)

hume_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=5),
    maximum_interval=timedelta(minutes=5),
    maximum_attempts=5,
    backoff_coefficient=2.0,
    non_retryable_error_types=["FileNotFoundError"]
)

# Define the activities stubs with retry policies
arangodb_activities = workflow.new_activity_stub(
    ArangoDBActivities, 
    start_to_close_timeout=timedelta(minutes=5),
    retry_policy=arangodb_retry_policy
)
hume_activities = workflow.new_activity_stub(
    HumeActivities, 
    start_to_close_timeout=timedelta(hours=2),
    retry_policy=hume_retry_policy
)

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
            session_info = await arangodb_activities.get_session_for_ingestion(session_id)
            
            # Step 2: Download media file
            workflow.logger.info(f"Step 2: Downloading media file for {session_id}")
            local_path = await arangodb_activities.download_media_file(session_info["storage_path"])

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
            await arangodb_activities.store_raw_hume_data((session_id, artifacts))
            
            # Step 7: Parse and store structured data
            workflow.logger.info(f"Step 7: Parsing and storing structured data for {session_id}")
            await arangodb_activities.parse_and_store_structured_data((session_id, artifacts))

            # Step 8: Update session status to complete
            workflow.logger.info(f"Step 8: Updating session status to COMPLETE for {session_id}")
            await arangodb_activities.update_session_status((session_id, "INGESTION_COMPLETE"))

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
                await arangodb_activities.update_session_status((session_id, "INGESTION_FAILED"))
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
                    await arangodb_activities.cleanup_temp_files(local_path)
                except Exception as cleanup_error:
                    workflow.logger.error(f"Failed to cleanup temporary file: {cleanup_error}")