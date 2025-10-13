#!/usr/bin/env python3
"""
Test script for Temporal workflows
"""

import asyncio
import sys
import os
from datetime import timedelta
from temporalio.client import Client
from temporalio import workflow

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

# Simple test workflow without external dependencies
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

async def test_workflow():
    """Test the workflow execution."""
    try:
        # Connect to Temporal server
        client = await Client.connect('spirit-temporal:7233')
        print("✅ Connected to Temporal server")
        
        # Test participant ID
        participant_id = 'test-participant-001'
        
        print(f"🚀 Starting TestImportWorkflow for participant: {participant_id}")
        
        # Execute workflow
        result = await client.execute_workflow(
            TestImportWorkflow.run,
            participant_id,
            id=f'test-import-{participant_id}',
            task_queue='spirit-in-physics-task-queue'
        )
        
        print(f"✅ Workflow completed successfully: {result}")
        
        # List workflows to verify it was created
        print("\n📋 Listing workflows...")
        async for workflow_exec in client.list_workflows():
            print(f"  - {workflow_exec.id} ({workflow_exec.status.name})")
        
        return result
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    result = asyncio.run(test_workflow())
    if result:
        print("\n🎉 Test completed successfully!")
    else:
        print("\n💥 Test failed!")
        sys.exit(1)
