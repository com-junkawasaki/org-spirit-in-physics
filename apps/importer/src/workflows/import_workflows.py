#!/usr/bin/env python3
"""
Import Workflows for Temporal

This module provides Temporal workflows for managing data import processes
with comprehensive status tracking and error handling.
"""

from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from ..activities.import_status_activities import ImportStatusActivities
    from ..activities.arangodb import ArangoDBActivities
    from ..activities.hume_activities import HumeActivities

# Define the activities stubs
import_status_activities = workflow.new_activity_stub(
    ImportStatusActivities, 
    start_to_close_timeout=timedelta(minutes=5),
    retry_policy=RetryPolicy(max_attempts=3)
)

arangodb_activities = workflow.new_activity_stub(
    ArangoDBActivities, 
    start_to_close_timeout=timedelta(minutes=10),
    retry_policy=RetryPolicy(max_attempts=3)
)

hume_activities = workflow.new_activity_stub(
    HumeActivities, 
    start_to_close_timeout=timedelta(hours=2),
    retry_policy=RetryPolicy(max_attempts=2)
)

@workflow.defn
class ParticipantImportWorkflow:
    """Workflow for importing a single participant's data."""
    
    @workflow.run
    async def run(self, participant_id: str, import_type: str = "participant_data", 
                 data_sources: list = None) -> dict:
        """Import data for a single participant."""
        workflow.set_search_attribute("participantId", participant_id)
        
        # Create import status
        await import_status_activities.create_import_status(
            participant_id, import_type, data_sources
        )
        
        # Create import job
        job_id = await import_status_activities.create_import_job(
            participant_id, f"{import_type}_import", priority=1
        )
        
        try:
            # Update status to in_progress
            await import_status_activities.update_import_status(
                participant_id, "in_progress"
            )
            
            await import_status_activities.update_import_job_status(
                job_id, "running"
            )
            
            # Import participant data
            result = await self._import_participant_data(participant_id, data_sources)
            
            if result["success"]:
                # Update status to completed
                await import_status_activities.update_import_status(
                    participant_id, "completed",
                    records_count=result["records_count"],
                    metadata=result["metadata"]
                )
                
                await import_status_activities.update_import_job_status(
                    job_id, "completed"
                )
                
                return {
                    "status": "SUCCESS",
                    "participant_id": participant_id,
                    "job_id": job_id,
                    "records_count": result["records_count"]
                }
            else:
                # Update status to failed
                await import_status_activities.update_import_status(
                    participant_id, "failed",
                    error_message=result["error_message"]
                )
                
                await import_status_activities.update_import_job_status(
                    job_id, "failed",
                    error_message=result["error_message"]
                )
                
                return {
                    "status": "FAILED",
                    "participant_id": participant_id,
                    "job_id": job_id,
                    "error": result["error_message"]
                }
                
        except Exception as e:
            # Update status to failed
            await import_status_activities.update_import_status(
                participant_id, "failed",
                error_message=str(e)
            )
            
            await import_status_activities.update_import_job_status(
                job_id, "failed",
                error_message=str(e)
            )
            
            return {
                "status": "FAILED",
                "participant_id": participant_id,
                "job_id": job_id,
                "error": str(e)
            }
    
    async def _import_participant_data(self, participant_id: str, data_sources: list) -> dict:
        """Import participant data with error handling."""
        try:
            # This is a placeholder for actual import logic
            # In a real implementation, this would call the appropriate import activities
            
            # Simulate import process
            await workflow.sleep(timedelta(seconds=5))
            
            # Return mock results
            return {
                "success": True,
                "records_count": {
                    "sessions": 2,
                    "responses": 100,
                    "hume_data": 50,
                    "physiological_data": 25
                },
                "metadata": {
                    "import_duration": "5 seconds",
                    "data_sources": data_sources or ["session_data.json", "consent.json"]
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error_message": str(e)
            }

@workflow.defn
class BatchImportWorkflow:
    """Workflow for importing multiple participants' data in batch."""
    
    @workflow.run
    async def run(self, participant_ids: list, import_type: str = "participant_data",
                 data_sources: list = None, max_concurrent: int = 3) -> dict:
        """Import data for multiple participants in batch."""
        workflow.set_search_attribute("batchImport", True)
        
        results = []
        failed_participants = []
        
        # Process participants in batches to avoid overwhelming the system
        for i in range(0, len(participant_ids), max_concurrent):
            batch = participant_ids[i:i + max_concurrent]
            
            # Create child workflows for each participant in the batch
            child_workflows = []
            for participant_id in batch:
                child_workflow = workflow.start_child_workflow(
                    ParticipantImportWorkflow.run,
                    participant_id,
                    import_type,
                    data_sources,
                    id=f"participant-import-{participant_id}"
                )
                child_workflows.append((participant_id, child_workflow))
            
            # Wait for all child workflows in this batch to complete
            for participant_id, child_workflow in child_workflows:
                try:
                    result = await child_workflow
                    results.append(result)
                    
                    if result["status"] == "FAILED":
                        failed_participants.append(participant_id)
                        
                except Exception as e:
                    failed_participants.append(participant_id)
                    results.append({
                        "status": "FAILED",
                        "participant_id": participant_id,
                        "error": str(e)
                    })
        
        # Calculate summary
        successful = len([r for r in results if r["status"] == "SUCCESS"])
        failed = len(failed_participants)
        
        return {
            "status": "COMPLETED",
            "total_participants": len(participant_ids),
            "successful": successful,
            "failed": failed,
            "failed_participants": failed_participants,
            "results": results
        }

@workflow.defn
class ImportRetryWorkflow:
    """Workflow for retrying failed imports with exponential backoff."""
    
    @workflow.run
    async def run(self, participant_id: str, max_retries: int = 3, 
                 base_delay: int = 60) -> dict:
        """Retry failed import with exponential backoff."""
        workflow.set_search_attribute("participantId", participant_id)
        workflow.set_search_attribute("retryWorkflow", True)
        
        for attempt in range(max_retries):
            try:
                # Get current import status
                status = await import_status_activities.get_import_status(participant_id)
                
                if not status or status.get("status") != "failed":
                    return {
                        "status": "SKIPPED",
                        "participant_id": participant_id,
                        "reason": "No failed import found or already fixed"
                    }
                
                # Wait with exponential backoff
                if attempt > 0:
                    delay = base_delay * (2 ** (attempt - 1))
                    await workflow.sleep(timedelta(seconds=delay))
                
                # Retry the import
                result = await workflow.execute_child_workflow(
                    ParticipantImportWorkflow.run,
                    participant_id,
                    id=f"retry-import-{participant_id}-attempt-{attempt + 1}"
                )
                
                if result["status"] == "SUCCESS":
                    return {
                        "status": "SUCCESS",
                        "participant_id": participant_id,
                        "attempt": attempt + 1,
                        "result": result
                    }
                
            except Exception as e:
                workflow.logger.error(f"Retry attempt {attempt + 1} failed for {participant_id}: {e}")
                
                if attempt == max_retries - 1:
                    return {
                        "status": "FAILED",
                        "participant_id": participant_id,
                        "attempts": max_retries,
                        "error": str(e)
                    }
        
        return {
            "status": "FAILED",
            "participant_id": participant_id,
            "attempts": max_retries,
            "error": "All retry attempts exhausted"
        }

@workflow.defn
class ImportMonitoringWorkflow:
    """Workflow for monitoring import status and triggering retries."""
    
    @workflow.run
    async def run(self, check_interval: int = 300) -> dict:
        """Monitor import status and trigger retries for failed imports."""
        workflow.set_search_attribute("monitoringWorkflow", True)
        
        while True:
            try:
                # Get import summary
                summary = await import_status_activities.get_import_summary()
                
                # Get pending jobs
                pending_jobs = await import_status_activities.get_pending_import_jobs()
                
                # Check for failed imports that need retry
                failed_participants = await import_status_activities.get_participants_by_status("failed")
                
                if failed_participants:
                    workflow.logger.info(f"Found {len(failed_participants)} failed imports to retry")
                    
                    # Start retry workflows for failed participants
                    for participant_id in failed_participants[:5]:  # Limit to 5 retries at once
                        await workflow.start_child_workflow(
                            ImportRetryWorkflow.run,
                            participant_id,
                            id=f"retry-monitor-{participant_id}"
                        )
                
                # Wait before next check
                await workflow.sleep(timedelta(seconds=check_interval))
                
            except Exception as e:
                workflow.logger.error(f"Error in monitoring workflow: {e}")
                await workflow.sleep(timedelta(seconds=60))  # Wait 1 minute before retrying
