from datetime import timedelta
from temporalio import workflow

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

# Assuming activities are defined in the other files
from .activities.arangodb_activities import ArangoDBActivities
from .activities.hume_activities import HumeActivities
from activities.hume_activities import process_media_file, store_hume_results

# Define the activities stubs
arangodb_activities = workflow.new_activity_stub(
    ArangoDBActivities, start_to_close_timeout=timedelta(minutes=5)
)
hume_activities = workflow.new_activity_stub(
    HumeActivities, start_to_close_timeout=timedelta(hours=2) # Hume can be long
)

@workflow.defn
class IngestionWorkflow:
    @workflow.run
    async def run(self, session_id: str) -> dict:
        workflow.set_search_attribute("sessionId", session_id)
        
        local_path = ""
        try:
            # 1. Get session info and download media
            session_info = await workflow.execute_activity(
                "get_session_for_ingestion", session_id,
                stub=arangodb_activities
            )
            local_path = await workflow.execute_activity(
                "download_media_file", session_info["storage_path"],
                stub=arangodb_activities,
                start_to_close_timeout=timedelta(minutes=10)
            )

            # 2. Submit to Hume AI and get job ID
            hume_job_id = await workflow.execute_activity(
                "submit_job_to_hume", local_path,
                stub=hume_activities,
                start_to_close_timeout=timedelta(minutes=5)
            )
            
            # 3. Poll and fetch Hume results
            artifacts = await workflow.execute_activity(
                "poll_and_fetch_hume_results", hume_job_id,
                stub=hume_activities # Long timeout is on the stub
            )

            # 4. Store raw and structured data
            await workflow.execute_activity(
                "store_raw_hume_data", (session_id, artifacts),
                stub=arangodb_activities
            )
            await workflow.execute_activity(
                "parse_and_store_structured_data", (session_id, artifacts),
                stub=arangodb_activities,
                start_to_close_timeout=timedelta(minutes=15)
            )

            # 5. Update session status
            await workflow.execute_activity(
                "update_session_status", (session_id, "INGESTION_COMPLETE"),
                stub=arangodb_activities
            )

            return {"status": "SUCCESS", "sessionId": session_id}

        finally:
            # 6. Cleanup
            if local_path:
                await workflow.execute_activity(
                    "cleanup_temp_files", local_path,
                    stub=arangodb_activities,
                    start_to_close_timeout=timedelta(minutes=2)
                )
