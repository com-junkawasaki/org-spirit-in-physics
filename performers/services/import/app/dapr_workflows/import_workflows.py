from typing import Dict, Any, List
from dapr.ext.workflow import DaprWorkflowContext, workflow

from app.dapr_activities import import_activities


@workflow
def import_participants_workflow(ctx: DaprWorkflowContext, dataset_path: str) -> Dict[str, Any]:
    """Workflow for importing participants from a dataset directory."""

    # List directories
    participant_dirs: List[Dict[str, str]] = yield ctx.call_activity(
        import_activities.list_participant_directories,
        input=dataset_path
    )

    results = []
    for p_info in participant_dirs:
        result = yield ctx.call_activity(
            import_activities.process_participant,
            input=p_info
        )
        results.append(result)

    return {
        "success": True,
        "total": len(participant_dirs),
        "processed": len(results),
        "results": results
    }


@workflow
def import_sessions_workflow(ctx: DaprWorkflowContext, dataset_path: str) -> Dict[str, Any]:
    """Workflow for importing sessions with physiological data."""

    # List directories
    participant_dirs: List[Dict[str, str]] = yield ctx.call_activity(
        import_activities.list_participant_directories,
        input=dataset_path
    )

    results = []
    for p_info in participant_dirs:
        # 1. Process each session (import raw events)
        result = yield ctx.call_activity(
            import_activities.process_session,
            input=p_info
        )

        # 2. Process physiological data if session import was successful
        if result.get("status") == "success":
            physio_input = {**result, "participant_path": p_info["participant_path"]}
            physio_result = yield ctx.call_activity(
                import_activities.process_physiological_data,
                input=physio_input
            )
            result["physiological"] = physio_result

        # 3. Automatically generate timeline points if session import was successful
        if result.get("status") == "success":
            timeline_result = yield ctx.call_activity(
                import_activities.generate_timeline,
                input=result
            )
            result["timeline"] = timeline_result

        results.append(result)

    return {
        "success": True,
        "total": len(participant_dirs),
        "processed": len(results),
        "results": results
    }


@workflow
def stimulus_audio_generation_workflow(ctx: DaprWorkflowContext, input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates audio for stimulus words across multiple languages.
    input_data: {
        "words": [{"id": 1, "text": "...", "lang": "ja"}, ...],
        "api_key": "..."
    }
    """
    words = input_data.get("words", [])
    api_key = input_data.get("api_key")

    results = []
    for word_info in words:
        activity_input = {**word_info, "api_key": api_key}

        result = yield ctx.call_activity(
            import_activities.generate_stimulus_audio,
            input=activity_input
        )
        results.append(result)

    return {
        "success": True,
        "total": len(words),
        "results": results
    }
