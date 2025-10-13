#!/usr/bin/env python3
"""
Test Temporal Worker for Import Workflows

This worker processes TestImportWorkflow and other import-related workflows.
"""

import asyncio
import sys
import os
from datetime import timedelta
from temporalio.client import Client
from temporalio.worker import Worker
from temporalio import workflow, activity

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

# Simple test workflow
@workflow.defn
class TestImportWorkflow:
    """Simple test workflow for import status management."""
    
    @workflow.run
    async def run(self, participant_id: str) -> dict:
        """Run a simple test workflow."""
        workflow.logger.info(f"Starting test workflow for participant: {participant_id}")
        
        # Simulate some work
        await workflow.sleep(timedelta(seconds=2))
        
        # Simulate import status updates
        workflow.logger.info(f"Import status: in_progress for {participant_id}")
        await workflow.sleep(timedelta(seconds=1))
        
        workflow.logger.info(f"Import status: completed for {participant_id}")
        
        return {
            "status": "SUCCESS",
            "participant_id": participant_id,
            "message": "Test workflow completed successfully"
        }

# Simple test activity
@activity.defn
async def test_import_activity(participant_id: str) -> dict:
    """Test activity for import processing."""
    activity.logger.info(f"Processing import for participant: {participant_id}")
    
    # Simulate processing time
    await asyncio.sleep(1)
    
    return {
        "participant_id": participant_id,
        "processed": True,
        "records_count": {
            "sessions": 2,
            "responses": 100,
            "hume_data": 50
        }
    }

# Enhanced workflow with activities
@workflow.defn
class ParticipantImportWorkflow:
    """Enhanced participant import workflow with activities."""
    
    @workflow.run
    async def run(self, participant_id: str, import_type: str = "participant_data", 
                 data_sources: list = None) -> dict:
        """Import data for a single participant."""
        workflow.logger.info(f"Starting ParticipantImportWorkflow for: {participant_id}")
        
        try:
            # Step 1: Create import status
            workflow.logger.info(f"Step 1: Creating import status for {participant_id}")
            await workflow.sleep(timedelta(seconds=0.5))
            
            # Step 2: Process import data
            workflow.logger.info(f"Step 2: Processing import data for {participant_id}")
            result = await workflow.execute_activity(
                test_import_activity,
                participant_id,
                start_to_close_timeout=timedelta(minutes=5)
            )
            
            # Step 3: Update status to completed
            workflow.logger.info(f"Step 3: Updating status to completed for {participant_id}")
            await workflow.sleep(timedelta(seconds=0.5))
            
            return {
                "status": "SUCCESS",
                "participant_id": participant_id,
                "import_type": import_type,
                "data_sources": data_sources or [],
                "result": result
            }
            
        except Exception as e:
            workflow.logger.error(f"Error in ParticipantImportWorkflow for {participant_id}: {e}")
            return {
                "status": "FAILED",
                "participant_id": participant_id,
                "error": str(e)
            }

# Batch import workflow
@workflow.defn
class BatchImportWorkflow:
    """Batch import workflow for multiple participants."""
    
    @workflow.run
    async def run(self, participant_ids: list, import_type: str = "participant_data",
                 data_sources: list = None, max_concurrent: int = 3) -> dict:
        """Import data for multiple participants in batch."""
        workflow.logger.info(f"Starting BatchImportWorkflow for {len(participant_ids)} participants")
        
        results = []
        failed_participants = []
        
        # Process participants in batches
        for i in range(0, len(participant_ids), max_concurrent):
            batch = participant_ids[i:i + max_concurrent]
            workflow.logger.info(f"Processing batch {i//max_concurrent + 1}: {batch}")
            
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
        
        workflow.logger.info(f"BatchImportWorkflow completed: {successful} successful, {failed} failed")
        
        return {
            "status": "COMPLETED",
            "total_participants": len(participant_ids),
            "successful": successful,
            "failed": failed,
            "failed_participants": failed_participants,
            "results": results
        }

async def main():
    """Main entry point for the worker."""
    print("🚀 Starting Temporal Worker for Import Workflows")
    
    try:
        # Connect to Temporal server
        client = await Client.connect('spirit-temporal:7233')
        print("✅ Connected to Temporal server")
        
        # Create worker
        worker = Worker(
            client,
            task_queue='spirit-in-physics-task-queue',
            workflows=[
                TestImportWorkflow,
                ParticipantImportWorkflow,
                BatchImportWorkflow
            ],
            activities=[
                test_import_activity
            ],
        )
        
        print("🔄 Worker created successfully")
        print("📋 Registered workflows:")
        print("  - TestImportWorkflow")
        print("  - ParticipantImportWorkflow")
        print("  - BatchImportWorkflow")
        print("📋 Registered activities:")
        print("  - test_import_activity")
        print("\n⏳ Starting worker...")
        
        # Start the worker
        await worker.run()
        
    except Exception as e:
        print(f"❌ Error starting worker: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
