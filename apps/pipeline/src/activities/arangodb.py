import sys
import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
from packages.spirit_in_physics_pipeline.data_loader import DataLoader
from packages.spirit_in_physics_pipeline.data_storer import DataStorer

logger = logging.getLogger(__name__)

class ArangoDBActivities:
    def __init__(self, config):
        self.config = config
        self.data_loader = DataLoader(config['arangodb'])
        self.data_storer = DataStorer(config['arangodb'])

    async def get_session_for_ingestion(self, session_id: str) -> dict:
        """Get experiment session information for ingestion workflow."""
        logger.info(f"Getting session for ingestion: {session_id}")
        
        try:
            # Query ArangoDB for session information
            aql_query = """
            FOR session IN participant_experiment_sessions
                FILTER session._key == @session_id
                RETURN {
                    id: session._key,
                    participant_id: session.participant_id,
                    storage_path: session.storage_path,
                    status: session.status,
                    created_at: session.created_at,
                    video_file_path: session.video_file_path
                }
            """
            
            cursor = self.data_loader.db.aql.execute(aql_query, bind_vars={"session_id": session_id})
            sessions = list(cursor)
            
            if not sessions:
                raise ValueError(f"Session {session_id} not found")
            
            session_info = sessions[0]
            logger.info(f"Found session: {session_info}")

            return session_info

        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            raise

    async def
    async def download_media_file(self, storage_path: str) -> str:
        """Download media file from storage to local temporary directory."""
        logger.info(f"Downloading media file: {storage_path}")
        
        try:
            # Use DataLoader's download method
            local_path = self.data_loader.download_media_file(storage_path)
            logger.info(f"Successfully downloaded to: {local_path}")
            return local_path
            
        except Exception as e:
            logger.error(f"Failed to download media file {storage_path}: {e}")
            raise

    async def
    async def store_raw_hume_data(self, data: tuple) -> None:
        """Store raw Hume AI analysis results in ArangoDB."""
        session_id, artifacts = data
        logger.info(f"Storing raw Hume data for session: {session_id}")
        
        try:
            # Store raw artifacts in a dedicated collection
            collection = self.data_storer.db.collection('hume_raw_artifacts')
            
            raw_data = {
                "_key": f"{session_id}_raw",
                "session_id": session_id,
                "artifacts": artifacts,
                "stored_at": datetime.utcnow().isoformat() + "Z",
                "data_type": "raw_hume_artifacts"
            }
            
            result = collection.insert(raw_data, overwrite=True)
            logger.info(f"Successfully stored raw Hume data for session {session_id}")
            
        except Exception as e:
            logger.error(f"Failed to store raw Hume data for session {session_id}: {e}")
            raise

    async def
    async def parse_and_store_structured_data(self, data: tuple) -> None:
        """Parse Hume AI artifacts and store structured data in ArangoDB."""
        session_id, artifacts = data
        logger.info(f"Parsing and storing structured Hume data for session: {session_id}")
        
        try:
            # Parse different types of Hume AI predictions
            structured_data = []
            
            # Process face predictions
            if 'face' in artifacts:
                for prediction in artifacts['face'].get('predictions', []):
                    structured_data.append({
                        "_key": f"{session_id}_face_{prediction.get('time', 0)}",
                        "session_id": session_id,
                        "prediction_type": "face",
                        "time": prediction.get('time', 0),
                        "emotions": prediction.get('emotions', []),
                        "face_box": prediction.get('face_box', {}),
                        "raw_prediction": prediction
                    })
            
            # Process prosody predictions
            if 'prosody' in artifacts:
                for prediction in artifacts['prosody'].get('predictions', []):
                    structured_data.append({
                        "_key": f"{session_id}_prosody_{prediction.get('time', 0)}",
                        "session_id": session_id,
                        "prediction_type": "prosody",
                        "time": prediction.get('time', 0),
                        "emotions": prediction.get('emotions', []),
                        "raw_prediction": prediction
                    })
            
            # Process language predictions
            if 'language' in artifacts:
                for prediction in artifacts['language'].get('predictions', []):
                    structured_data.append({
                        "_key": f"{session_id}_language_{prediction.get('time', 0)}",
                        "session_id": session_id,
                        "prediction_type": "language",
                        "time": prediction.get('time', 0),
                        "text": prediction.get('text', ''),
                        "emotions": prediction.get('emotions', []),
                        "raw_prediction": prediction
                    })
            
            # Store structured data
            collection = self.data_storer.db.collection('hume_structured_predictions')
            for item in structured_data:
                try:
                    collection.insert(item, overwrite=True)
                except Exception as e:
                    logger.warning(f"Failed to store structured prediction {item['_key']}: {e}")
            
            logger.info(f"Successfully stored {len(structured_data)} structured predictions for session {session_id}")
            
        except Exception as e:
            logger.error(f"Failed to parse and store structured data for session {session_id}: {e}")
            raise

    async def
    async def update_session_status(self, data: tuple) -> None:
        """Update experiment session status in ArangoDB."""
        session_id, status = data
        logger.info(f"Updating session {session_id} to status: {status}")
        
        try:
            collection = self.data_storer.db.collection('participant_experiment_sessions')
            
            # Update session status
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow().isoformat() + "Z"
            }
            
            result = collection.update({"_key": session_id}, update_data)
            logger.info(f"Successfully updated session {session_id} to status: {status}")
            
        except Exception as e:
            logger.error(f"Failed to update session {session_id} status: {e}")
            raise

    async def
    async def cleanup_temp_files(self, local_path: str) -> None:
        """Clean up temporary files after processing."""
        logger.info(f"Cleaning up temporary file: {local_path}")
        
        try:
            if os.path.exists(local_path):
                os.remove(local_path)
                logger.info(f"Successfully removed temporary file: {local_path}")
            else:
                logger.warning(f"Temporary file not found: {local_path}")
                
        except Exception as e:
            logger.error(f"Failed to cleanup temporary file {local_path}: {e}")
            # Don't raise exception for cleanup failures
