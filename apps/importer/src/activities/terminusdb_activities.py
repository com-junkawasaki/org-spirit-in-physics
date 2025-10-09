import logging
from temporalio import activity
from terminusdb_client import WOQLClient, WOQLQuery
import os
from pathlib import Path
import json

# A simple logger
logging.basicConfig(level=logging.INFO)

class TerminusDBActivities:
    def __init__(self, config):
        self.config = config
        self.client = None
        self.database_id = "spirit_in_physics"

    def _get_client(self) -> WOQLClient:
        """Get or create TerminusDB client."""
        if not self.client:
            self.client = WOQLClient(
                server=self.config.get('url', 'http://localhost:6363'),
                user=self.config.get('user', 'admin'),
                password=self.config.get('password', 'root')
            )
            self.client.connect(self.database_id)
        return self.client

    @activity.defn
    async def get_session_for_ingestion(self, session_id: str) -> dict:
        """Fetches session info, including the media file storage path."""
        activity.logger.info(f"Fetching session data for session_id: {session_id}")
        client = self._get_client()

        try:
            # Query session data
            query = WOQLQuery().woql_and(
                WOQLQuery().triple(f"terminusdb:///data/ExperimentSession/{session_id}", "rdf:type", "scm:ExperimentSession"),
                WOQLQuery().triple(f"terminusdb:///data/ExperimentSession/{session_id}", "scm:id", "v:SessionId"),
                WOQLQuery().triple(f"terminusdb:///data/ExperimentSession/{session_id}", "belongs_to_participant", "v:Participant"),
                # Get response data for this session
                WOQLQuery().triple("v:Response", "belongs_to_session", f"terminusdb:///data/ExperimentSession/{session_id}"),
                WOQLQuery().triple("v:Response", "video_file_path", "v:VideoPath").opt(),
                WOQLQuery().triple("v:Response", "audio_file_path", "v:AudioPath").opt()
            )

            result = client.query(query)
            if not result.get("bindings"):
                raise ValueError(f"Session with id {session_id} not found.")

            binding = result["bindings"][0]

            # Determine media path
            media_path = binding.get("VideoPath", {}).get("@value") or binding.get("AudioPath", {}).get("@value")

            if not media_path:
                raise ValueError(f"No media file path found for session {session_id}")

            return {"storage_path": media_path}

        except Exception as e:
            activity.logger.error(f"Failed to fetch session data: {e}")
            raise

    @activity.defn
    async def download_media_file(self, storage_path: str) -> str:
        """Downloads a file from storage and returns the local path."""
        activity.logger.info(f"Downloading media file from: {storage_path}")

        # For now, assume files are stored locally or accessible via file path
        # In a production setup, this would need to be adapted for the actual storage system

        local_dir = "/tmp/spirit-importer"
        os.makedirs(local_dir, exist_ok=True)
        local_file_path = os.path.join(local_dir, os.path.basename(storage_path))

        # Copy file if it exists locally
        if os.path.exists(storage_path):
            import shutil
            shutil.copy2(storage_path, local_file_path)
        else:
            raise FileNotFoundError(f"Media file not found: {storage_path}")

        activity.logger.info(f"File copied to: {local_file_path}")
        return local_file_path

    @activity.defn
    async def store_raw_hume_data(self, session_id: str, artifacts: dict) -> str:
        """Stores the raw Hume AI artifacts JSON."""
        activity.logger.info(f"Storing raw Hume artifacts for session: {session_id}")
        client = self._get_client()

        try:
            # Store raw data as a document in TerminusDB
            raw_data_id = f"hume_raw_{session_id}"
            raw_data_iri = f"terminusdb:///data/HumeRawData/{raw_data_id}"

            raw_data_doc = {
                "@type": "HumeRawData",
                "@id": raw_data_iri,
                "id": raw_data_id,
                "session_id": session_id,
                "artifacts": json.dumps(artifacts),
                "created_at": "2025-10-09T00:00:00Z"  # Should use current timestamp
            }

            query = WOQLQuery().insert(raw_data_doc)
            client.query(query)

            return raw_data_iri

        except Exception as e:
            activity.logger.error(f"Failed to store raw Hume data: {e}")
            raise

    @activity.defn
    async def parse_and_store_structured_data(self, session_id: str, artifacts: dict):
        """Parses the Hume artifacts and stores structured data."""
        activity.logger.info(f"Parsing and storing structured Hume data for session: {session_id}")
        client = self._get_client()

        try:
            # This will contain the logic to parse Hume artifacts and store in TerminusDB
            # Similar to HumeDataProcessor but using TerminusDB instead of Supabase

            session_iri = f"terminusdb:///data/ExperimentSession/{session_id}"

            # Parse and insert emotion data
            if "predictions" in artifacts:
                for prediction in artifacts["predictions"]:
                    if "emotions" in prediction:
                        for emotion in prediction["emotions"]:
                            emotion_id = f"emotion_{session_id}_{emotion.get('name', 'unknown')}"
                            emotion_iri = f"terminusdb:///data/Emotion/{emotion_id}"

                            emotion_doc = {
                                "@type": "Emotion",
                                "@id": emotion_iri,
                                "id": emotion_id,
                                "name": emotion.get("name"),
                                "score": emotion.get("score"),
                                "session_id": session_id,
                                "belongs_to_session": session_iri
                            }

                            query = WOQLQuery().woql_and(
                                WOQLQuery().insert(emotion_doc),
                                WOQLQuery().link(session_iri, "has_emotion", emotion_iri)
                            )
                            client.query(query)

            activity.logger.info(f"Successfully stored structured data for session {session_id}")

        except Exception as e:
            activity.logger.error(f"Failed to parse and store structured data: {e}")
            raise

    @activity.defn
    async def update_session_status(self, session_id: str, new_status: str):
        """Updates the status of the session."""
        activity.logger.info(f"Updating status for session {session_id} to {new_status}")
        client = self._get_client()

        try:
            session_iri = f"terminusdb:///data/ExperimentSession/{session_id}"

            # Update session status
            update_data = {
                "status": new_status,
                "updated_at": "2025-10-09T00:00:00Z"  # Should use current timestamp
            }

            query = WOQLQuery().update_object(update_data).id(session_iri)
            client.query(query)

        except Exception as e:
            activity.logger.error(f"Failed to update session status: {e}")
            raise

    @activity.defn
    async def cleanup_temp_files(self, local_file_path: str):
        """Removes temporary local files."""
        activity.logger.info(f"Cleaning up temporary file: {local_file_path}")
        if os.path.exists(local_file_path):
            os.remove(local_file_path)

    def close(self):
        """Close the TerminusDB connection."""
        if self.client:
            self.client.close()
