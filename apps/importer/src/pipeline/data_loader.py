from supabase import create_client, Client
import logging
import os
import tempfile
from typing import Optional, Dict, Any, List

class DataLoader:
    def __init__(self, config):
        self.supabase: Client = create_client(config['url'], config['service_role_key'])
        self.bucket_name = "spirit-in-physics"
        logging.info("DataLoader initialized and Supabase client created.")

    def get_unprocessed_responses(self, limit: int = 10):
        """
        Fetches responses from participant_response_data that have not yet
        been processed in the latest analysis run. This logic is a placeholder
        and should be refined.
        """
        logging.info("Fetching unprocessed responses...")
        # In a real scenario, you'd join against analysis_results to find unprocessed items.
        response = self.supabase.table('participant_response_data').select('*').limit(limit).execute()
        if response.data:
            logging.info(f"Found {len(response.data)} responses.")
            return response.data
        else:
            logging.warning("No new responses found.")
            return []

    def download_media_file(self, storage_path: str, local_dir: Optional[str] = None) -> str:
        """
        Downloads a media file from Supabase Storage to local filesystem.

        Args:
            storage_path: Path in Supabase Storage (e.g., "participant-uuid/audio/filename.mp4")
            local_dir: Local directory to save file. If None, uses temp directory.

        Returns:
            Local file path of downloaded file
        """
        if local_dir is None:
            local_dir = tempfile.gettempdir()

        # Extract filename from storage path
        filename = os.path.basename(storage_path)
        local_path = os.path.join(local_dir, filename)

        logging.info(f"Downloading file from storage: {storage_path} -> {local_path}")

        try:
            # Download file from Supabase Storage
            with open(local_path, 'wb') as f:
                res = self.supabase.storage.from_(self.bucket_name).download(storage_path)
                f.write(res)

            logging.info(f"Successfully downloaded file to: {local_path}")
            return local_path

        except Exception as e:
            logging.error(f"Failed to download file {storage_path}: {e}")
            raise

    def get_experiment_session_for_response(self, response_id: str) -> Optional[Dict[str, Any]]:
        """
        Gets the experiment session associated with a response.
        This is needed to link responses to Hume AI analysis data.
        """
        try:
            logging.info(f"Finding experiment session for response {response_id}")

            # First get the response to find the participant_id
            response = self.supabase.table('participant_response_data').select('participant_id').eq('id', response_id).execute()

            if not response.data or len(response.data) == 0:
                logging.warning(f"Response {response_id} not found")
                return None

            participant_id = response.data[0]['participant_id']

            # Find the most recent experiment session for this participant
            # (assuming responses are linked to the most recent session)
            session = self.supabase.table('participant_experiment_sessions').select('*').eq(
                'participant_id', participant_id
            ).order('created_at', desc=True).limit(1).execute()

            if session.data and len(session.data) > 0:
                return session.data[0]
            else:
                logging.warning(f"No experiment session found for participant {participant_id}")
                return None

        except Exception as e:
            logging.error(f"Error getting experiment session for response {response_id}: {e}")
            return None

    def get_participant_sessions(self, participant_id: str) -> List[Dict[str, Any]]:
        """参加者の実験セッションを取得"""
        try:
            response = self.supabase.table('participant_experiment_sessions').select('*').eq('participant_id', participant_id).execute()
            return response.data if response.data else []
        except Exception as e:
            logging.error(f"Failed to get participant sessions: {e}")
            return []

    def get_response_with_media(self, response_id: str) -> Optional[dict]:
        """
        Gets a specific response with its associated media file information.
        """
        logging.info(f"Fetching response {response_id} with media info...")

        response = self.supabase.table('participant_response_data').select('*').eq('id', response_id).execute()

        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            logging.warning(f"Response {response_id} not found.")
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
            response = self.supabase.table('response_skin_potential_timeseries').select('*').eq('response_id', response_id).order('timestamp_offset_ms').execute()

            if response.data:
                logging.info(f"Loaded {len(response.data)} skin potential data points")
                return response.data
            else:
                logging.info(f"No skin potential data found for response {response_id}")
                return []

        except Exception as e:
            logging.error(f"Failed to load skin potential data for response {response_id}: {e}")
            return []
