import logging
from temporalio import activity
from supabase import create_client, Client
import os

# Pydantic models for data structures can be defined here
# from pydantic import BaseModel

# A simple logger
logging.basicConfig(level=logging.INFO)

class SupabaseActivities:
    def __init__(self, config):
        self.supabase: Client = create_client(config['url'], config['service_role_key'])
        self.config = config

    @activity.defn
    async def get_session_for_ingestion(self, session_id: str) -> dict:
        """Fetches session info, including the media file storage path."""
        activity.logger.info(f"Fetching session data for session_id: {session_id}")
        response = self.supabase.table("participant_experiment_sessions").select("*, participant_response_data(*)").eq("id", session_id).single().execute()
        if not response.data:
            raise ValueError(f"Session with id {session_id} not found.")
        # Assuming the response data contains a path to the media file in Supabase Storage
        # This part might need adjustment based on the actual schema
        media_path = response.data.get("participant_response_data", [{}])[0].get("video_file_path")
        if not media_path:
             media_path = response.data.get("participant_response_data", [{}])[0].get("audio_file_path")

        if not media_path:
            raise ValueError(f"No media file path found for session {session_id}")

        return {"storage_path": media_path}


    @activity.defn
    async def download_media_file(self, storage_path: str) -> str:
        """Downloads a file from Supabase Storage and returns the local path."""
        activity.logger.info(f"Downloading media file from: {storage_path}")
        
        # bucket_name = "your_bucket_name" # e.g., "experiment-media"
        # This needs to be inferred from the storage_path or configured
        path_parts = storage_path.split('/')
        bucket_name = path_parts[0]
        file_path = '/'.join(path_parts[1:])
        
        local_dir = "/tmp/spirit-importer"
        os.makedirs(local_dir, exist_ok=True)
        local_file_path = os.path.join(local_dir, os.path.basename(file_path))

        with open(local_file_path, "wb+") as f:
            res = self.supabase.storage.from_(bucket_name).download(file_path)
            f.write(res)
        
        activity.logger.info(f"File downloaded to: {local_file_path}")
        return local_file_path

    @activity.defn
    async def store_raw_hume_data(self, session_id: str, artifacts: dict) -> str:
        """Stores the raw Hume AI artifacts JSON to Supabase Storage."""
        activity.logger.info(f"Storing raw Hume artifacts for session: {session_id}")
        # Logic to store the raw JSON file
        return "path/to/stored/artifacts.json"

    @activity.defn
    async def parse_and_store_structured_data(self, session_id: str, artifacts: dict):
        """Parses the Hume artifacts and stores structured data in Supabase tables."""
        activity.logger.info(f"Parsing and storing structured Hume data for session: {session_id}")
        # This will contain the logic from HumeDataProcessor to parse and insert data
        # into tables like 'participant_hume_burst_predictions', etc.
        pass

    @activity.defn
    async def update_session_status(self, session_id: str, new_status: str):
        """Updates the status of the session in the database."""
        activity.logger.info(f"Updating status for session {session_id} to {new_status}")
        self.supabase.table("participant_experiment_sessions").update({"status": new_status}).eq("id", session_id).execute()

    @activity.defn
    async def cleanup_temp_files(self, local_file_path: str):
        """Removes temporary local files."""
        activity.logger.info(f"Cleaning up temporary file: {local_file_path}")
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
