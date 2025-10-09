from datetime import timedelta
from temporalio import workflow

# Assuming activities are defined in the other files
from .activities.supabase_activities import SupabaseActivities
from .activities.hume_activities import HumeActivities

# Define the activities stubs
supabase_activities = workflow.new_activity_stub(
    SupabaseActivities, start_to_close_timeout=timedelta(minutes=5)
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
                stub=supabase_activities
            )
            local_path = await workflow.execute_activity(
                "download_media_file", session_info["storage_path"],
                stub=supabase_activities,
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
                stub=supabase_activities
            )
            await workflow.execute_activity(
                "parse_and_store_structured_data", (session_id, artifacts),
                stub=supabase_activities,
                start_to_close_timeout=timedelta(minutes=15)
            )

            # 5. Update session status
            await workflow.execute_activity(
                "update_session_status", (session_id, "INGESTION_COMPLETE"),
                stub=supabase_activities
            )

            return {"status": "SUCCESS", "sessionId": session_id}

        finally:
            # 6. Cleanup
            if local_path:
                await workflow.execute_activity(
                    "cleanup_temp_files", local_path,
                    stub=supabase_activities,
                    start_to_close_timeout=timedelta(minutes=2)
                )
