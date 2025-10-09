from terminusdb_client import WOQLClient, WOQLQuery
import logging
import os
import tempfile
from typing import Optional, Dict, Any, List

class DataLoader:
    def __init__(self, config):
        self.client = WOQLClient(
            server=config['url'],
            user=config['user'],
            password=config['password']
        )
        self.database_id = config['database_id']
        self.client.connect(self.database_id)
        logging.info("DataLoader initialized and TerminusDB client connected.")

    def get_unprocessed_responses(self, limit: int = 10):
        """
        Fetches responses from participant_response_data that have not yet
        been processed in the latest analysis run. This logic is a placeholder
        and should be refined.
        """
        logging.info("Fetching unprocessed responses...")

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().triple("v:Response", "rdf:type", "scm:ResponseData"),
                WOQLQuery().triple("v:Response", "scm:id", "v:Id"),
                WOQLQuery().triple("v:Response", "scm:stimulus_word", "v:StimulusWord"),
                WOQLQuery().triple("v:Response", "scm:response_word", "v:ResponseWord"),
                WOQLQuery().triple("v:Response", "scm:reaction_time_ms", "v:ReactionTime"),
                WOQLQuery().triple("v:Response", "belongs_to_participant", "v:Participant"),
                WOQLQuery().limit(limit)
            )

            result = self.client.query(query)
            responses = []

            for binding in result.get("bindings", []):
                response_data = {
                    "id": binding.get("Id", {}).get("@value"),
                    "stimulus_word": binding.get("StimulusWord", {}).get("@value"),
                    "response_word": binding.get("ResponseWord", {}).get("@value"),
                    "reaction_time_ms": int(binding.get("ReactionTime", {}).get("@value", 0)),
                    "participant_id": binding.get("Participant", {}).get("@value", "").split("/")[-1] if binding.get("Participant") else None
                }
                responses.append(response_data)

            logging.info(f"Found {len(responses)} responses.")
            return responses

        except Exception as e:
            logging.error(f"Failed to fetch unprocessed responses: {e}")
            return []

    def download_media_file(self, storage_path: str, local_dir: Optional[str] = None) -> str:
        """
        Downloads a media file from local filesystem or external storage.

        Args:
            storage_path: Path to media file (local path or URL)
            local_dir: Local directory to save file. If None, uses temp directory.

        Returns:
            Local file path of the file
        """
        if local_dir is None:
            local_dir = tempfile.gettempdir()

        # Extract filename from storage path
        filename = os.path.basename(storage_path)
        local_path = os.path.join(local_dir, filename)

        logging.info(f"Processing media file: {storage_path} -> {local_path}")

        try:
            # For now, assume files are accessible locally or via direct path
            # In production, this would need integration with actual storage service
            if os.path.exists(storage_path):
                import shutil
                shutil.copy2(storage_path, local_path)
                logging.info(f"Successfully copied file to: {local_path}")
            else:
                # If file doesn't exist locally, create an empty file as placeholder
                with open(local_path, 'w') as f:
                    f.write("# Placeholder for media file")
                logging.warning(f"Media file not found locally: {storage_path}, created placeholder")

            return local_path

        except Exception as e:
            logging.error(f"Failed to process media file {storage_path}: {e}")
            raise

    def get_experiment_session_for_response(self, response_id: str) -> Optional[Dict[str, Any]]:
        """
        Gets the experiment session associated with a response.
        This is needed to link responses to Hume AI analysis data.
        """
        try:
            logging.info(f"Finding experiment session for response {response_id}")

            query = WOQLQuery().woql_and(
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "belongs_to_session", "v:Session"),
                WOQLQuery().triple("v:Session", "rdf:type", "scm:ExperimentSession"),
                WOQLQuery().triple("v:Session", "scm:id", "v:SessionId"),
                WOQLQuery().triple("v:Session", "scm:session_type", "v:SessionType"),
                WOQLQuery().triple("v:Session", "scm:start_time", "v:StartTime").opt(),
                WOQLQuery().triple("v:Session", "scm:end_time", "v:EndTime").opt(),
                WOQLQuery().triple("v:Session", "belongs_to_participant", "v:Participant")
            )

            result = self.client.query(query)

            if result.get("bindings") and len(result["bindings"]) > 0:
                binding = result["bindings"][0]
                session_data = {
                    "id": binding.get("SessionId", {}).get("@value"),
                    "session_type": binding.get("SessionType", {}).get("@value"),
                    "start_time": binding.get("StartTime", {}).get("@value"),
                    "end_time": binding.get("EndTime", {}).get("@value"),
                    "participant_id": binding.get("Participant", {}).get("@value", "").split("/")[-1] if binding.get("Participant") else None
                }
                return session_data
            else:
                logging.warning(f"No experiment session found for response {response_id}")
                return None

        except Exception as e:
            logging.error(f"Error getting experiment session for response {response_id}: {e}")
            return None

    def get_participant_sessions(self, participant_id: str) -> List[Dict[str, Any]]:
        """参加者の実験セッションを取得"""
        try:
            participant_iri = f"terminusdb:///data/Participant/{participant_id}"

            query = WOQLQuery().woql_and(
                WOQLQuery().triple("v:Session", "belongs_to_participant", participant_iri),
                WOQLQuery().triple("v:Session", "rdf:type", "scm:ExperimentSession"),
                WOQLQuery().triple("v:Session", "scm:id", "v:SessionId"),
                WOQLQuery().triple("v:Session", "scm:session_type", "v:SessionType"),
                WOQLQuery().triple("v:Session", "scm:start_time", "v:StartTime").opt(),
                WOQLQuery().triple("v:Session", "scm:end_time", "v:EndTime").opt()
            )

            result = self.client.query(query)
            sessions = []

            for binding in result.get("bindings", []):
                session_data = {
                    "id": binding.get("SessionId", {}).get("@value"),
                    "session_type": binding.get("SessionType", {}).get("@value"),
                    "start_time": binding.get("StartTime", {}).get("@value"),
                    "end_time": binding.get("EndTime", {}).get("@value"),
                    "participant_id": participant_id
                }
                sessions.append(session_data)

            return sessions

        except Exception as e:
            logging.error(f"Failed to get participant sessions: {e}")
            return []

    def get_response_with_media(self, response_id: str) -> Optional[dict]:
        """
        Gets a specific response with its associated media file information.
        """
        logging.info(f"Fetching response {response_id} with media info...")

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "rdf:type", "scm:ResponseData"),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:id", "v:Id"),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:stimulus_word", "v:StimulusWord"),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:response_word", "v:ResponseWord"),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:audio_file_path", "v:AudioPath").opt(),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:video_file_path", "v:VideoPath").opt(),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "belongs_to_participant", "v:Participant")
            )

            result = self.client.query(query)

            if result.get("bindings") and len(result["bindings"]) > 0:
                binding = result["bindings"][0]
                response_data = {
                    "id": binding.get("Id", {}).get("@value"),
                    "stimulus_word": binding.get("StimulusWord", {}).get("@value"),
                    "response_word": binding.get("ResponseWord", {}).get("@value"),
                    "audio_file_path": binding.get("AudioPath", {}).get("@value"),
                    "video_file_path": binding.get("VideoPath", {}).get("@value"),
                    "participant_id": binding.get("Participant", {}).get("@value", "").split("/")[-1] if binding.get("Participant") else None
                }
                return response_data
            else:
                logging.warning(f"Response {response_id} not found.")
                return None

        except Exception as e:
            logging.error(f"Failed to fetch response {response_id}: {e}")
            return None

    def get_media_files_for_response(self, response_data: dict) -> dict:
        """
        Extracts media file paths from response data.

        Returns:
            Dict with keys: 'video_path', 'audio_path' (may be None)
        """
        video_path = response_data.get('video_file_path')
        audio_path = response_data.get('audio_file_path')

        # These paths should be relative to the spirit-in-physics bucket
        # Format: participant-uuid/type/filename.ext

        return {
            'video_path': video_path,
            'audio_path': audio_path
        }

    def load_skin_potential_data(self, response_id: str) -> list:
        """
        Loads skin potential time-series data for a specific response.

        Args:
            response_id: UUID of the response

        Returns:
            List of skin potential data points with timestamp offsets
        """
        logging.info(f"Loading skin potential data for response: {response_id}")

        try:
            # For now, return the skin_potential value directly from the response
            # In the future, this could be extended to handle time-series data
            query = WOQLQuery().woql_and(
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:skin_potential", "v:SkinPotential").opt()
            )

            result = self.client.query(query)

            if result.get("bindings") and len(result["bindings"]) > 0:
                binding = result["bindings"][0]
                skin_potential = binding.get("SkinPotential", {}).get("@value")

                if skin_potential is not None:
                    logging.info(f"Loaded skin potential data for response {response_id}")
                    return [{"value": float(skin_potential), "timestamp_offset_ms": 0}]
                else:
                    logging.info(f"No skin potential data found for response {response_id}")
                    return []
            else:
                logging.info(f"No skin potential data found for response {response_id}")
                return []

        except Exception as e:
            logging.error(f"Failed to load skin potential data for response {response_id}: {e}")
            return []
