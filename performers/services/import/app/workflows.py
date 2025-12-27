from datetime import timedelta
from typing import List, Dict, Any
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from app.activities import ImportActivities

@workflow.defn
class ImportParticipantsWorkflow:
    @workflow.run
    async def run(self, dataset_path: str) -> Dict[str, Any]:
        activities = ImportActivities()
        
        # List directories
        participant_dirs = await workflow.execute_activity(
            activities.list_participant_directories,
            dataset_path,
            start_to_close_timeout=timedelta(seconds=60),
        )
        
        results = []
        for p_info in participant_dirs:
            # Process each participant
            result = await workflow.execute_activity(
                activities.process_participant,
                p_info,
                start_to_close_timeout=timedelta(seconds=60),
            )
            results.append(result)
            
        return {
            "success": True,
            "total": len(participant_dirs),
            "processed": len(results),
            "results": results
        }

@workflow.defn
class ImportSessionsWorkflow:
    @workflow.run
    async def run(self, dataset_path: str) -> Dict[str, Any]:
        activities = ImportActivities()
        
        # List directories
        participant_dirs = await workflow.execute_activity(
            activities.list_participant_directories,
            dataset_path,
            start_to_close_timeout=timedelta(seconds=60),
        )
        
        results = []
        for p_info in participant_dirs:
            # Process each session
            result = await workflow.execute_activity(
                activities.process_session,
                p_info,
                start_to_close_timeout=timedelta(seconds=60),
            )
            results.append(result)
            
        return {
            "success": True,
            "total": len(participant_dirs),
            "processed": len(results),
            "results": results
        }
