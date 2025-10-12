from datetime import timedelta
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from .activities.arangodb import ArangoDBActivities
    from .activities.hume_activities import HumeActivities

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
            session_info = await arangodb_activities.get_session_for_ingestion(session_id)
            local_path = await arangodb_activities.download_media_file(session_info["storage_path"])

            hume_job_id = await hume_activities.submit_job_to_hume(local_path)
            artifacts = await hume_activities.poll_and_fetch_hume_results(hume_job_id)

            await arangodb_activities.store_raw_hume_data((session_id, artifacts))
            await arangodb_activities.parse_and_store_structured_data((session_id, artifacts))

            await arangodb_activities.update_session_status((session_id, "INGESTION_COMPLETE"))

            return {"status": "SUCCESS", "sessionId": session_id}

        finally:
            if local_path:
                await arangodb_activities.cleanup_temp_files(local_path)
