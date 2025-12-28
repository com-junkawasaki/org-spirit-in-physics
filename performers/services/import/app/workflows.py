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
            # 1. Process each session (import raw events)
            result = await workflow.execute_activity(
                activities.process_session,
                p_info,
                start_to_close_timeout=timedelta(seconds=60),
            )
            
            # 2. Process physiological data if session import was successful
            if result.get("status") == "success":
                try:
                    physio_result = await workflow.execute_activity(
                        activities.process_physiological_data,
                        result | {"participant_path": p_info["participant_path"]},
                        start_to_close_timeout=timedelta(seconds=120),
                    )
                    result["physiological"] = physio_result
                except Exception as e:
                    result["physiological"] = {"status": "error", "message": str(e)}

            # 3. Automatically generate timeline points if session import was successful
            if result.get("status") == "success":
                try:
                    timeline_result = await workflow.execute_activity(
                        activities.generate_timeline,
                        result,
                        start_to_close_timeout=timedelta(seconds=120),
                    )
                    result["timeline"] = timeline_result
                except Exception as e:
                    result["timeline"] = {"status": "error", "message": str(e)}
            
            results.append(result)
            
        return {
            "success": True,
            "total": len(participant_dirs),
            "processed": len(results),
            "results": results
        }
