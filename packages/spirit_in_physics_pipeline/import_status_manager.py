#!/usr/bin/env python3
"""
Import Status Manager for Spirit in Physics Pipeline

This module provides functionality to track and manage import status
of participant data in the ArangoDB database.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass

from arango import ArangoClient

logger = logging.getLogger(__name__)

class ImportStatus(Enum):
    """Import status enumeration."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"
    IMPORTED = "imported"  # Legacy status for existing data

class ImportType(Enum):
    """Import type enumeration."""
    PARTICIPANT_DATA = "participant_data"
    SESSION_DATA = "session_data"
    RESPONSE_DATA = "response_data"
    HUME_DATA = "hume_data"
    PHYSIOLOGICAL_DATA = "physiological_data"

@dataclass
class ImportRecord:
    """Import record data structure."""
    participant_id: str
    status: ImportStatus
    import_type: ImportType
    imported_at: Optional[str] = None
    last_updated: Optional[str] = None
    data_sources: Optional[List[str]] = None
    records_count: Optional[Dict[str, int]] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ImportStatusManager:
    """Manager for tracking import status in ArangoDB."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize the import status manager."""
        self.client = ArangoClient(hosts=config['url'])
        self.db = self.client.db(config['database'], username=config['user'], password=config['password'])
        self.config = config
        logger.info("ImportStatusManager initialized.")
    
    def create_import_status_collections(self) -> bool:
        """Create necessary collections for import status tracking."""
        try:
            collections = ['import_status', 'import_jobs']
            
            for collection_name in collections:
                if not self.db.has_collection(collection_name):
                    self.db.create_collection(collection_name)
                    logger.info(f"Created collection: {collection_name}")
                else:
                    logger.info(f"Collection {collection_name} already exists")
            
            return True
        except Exception as e:
            logger.error(f"Failed to create import status collections: {e}")
            return False
    
    def create_import_status(self, participant_id: str, import_type: ImportType, 
                           data_sources: List[str] = None) -> bool:
        """Create a new import status record."""
        try:
            collection = self.db.collection('import_status')
            
            status_doc = {
                "_key": participant_id,
                "participant_id": participant_id,
                "status": ImportStatus.PENDING.value,
                "import_type": import_type.value,
                "imported_at": None,
                "last_updated": datetime.now().isoformat(),
                "data_sources": data_sources or [],
                "records_count": {
                    "sessions": 0,
                    "responses": 0,
                    "hume_data": 0,
                    "physiological_data": 0
                },
                "error_message": None,
                "metadata": {}
            }
            
            collection.insert(status_doc, overwrite=True)
            logger.info(f"Created import status for participant: {participant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create import status for {participant_id}: {e}")
            return False
    
    def update_import_status(self, participant_id: str, status: ImportStatus, 
                           error_message: str = None, records_count: Dict[str, int] = None,
                           metadata: Dict[str, Any] = None) -> bool:
        """Update import status for a participant."""
        try:
            collection = self.db.collection('import_status')
            
            update_data = {
                "status": status.value,
                "last_updated": datetime.now().isoformat()
            }
            
            if status == ImportStatus.COMPLETED:
                update_data["imported_at"] = datetime.now().isoformat()
            
            if error_message:
                update_data["error_message"] = error_message
            
            if records_count:
                update_data["records_count"] = records_count
            
            if metadata:
                update_data["metadata"] = metadata
            
            collection.update({"_key": participant_id}, update_data)
            logger.info(f"Updated import status for {participant_id}: {status.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update import status for {participant_id}: {e}")
            return False
    
    def get_import_status(self, participant_id: str) -> Optional[ImportRecord]:
        """Get import status for a participant."""
        try:
            collection = self.db.collection('import_status')
            result = collection.find({"_key": participant_id})
            records = list(result)
            
            if not records:
                return None
            
            record = records[0]
            return ImportRecord(
                participant_id=record["participant_id"],
                status=ImportStatus(record["status"]),
                import_type=ImportType(record["import_type"]),
                imported_at=record.get("imported_at"),
                last_updated=record.get("last_updated"),
                data_sources=record.get("data_sources"),
                records_count=record.get("records_count"),
                error_message=record.get("error_message"),
                metadata=record.get("metadata")
            )
            
        except Exception as e:
            logger.error(f"Failed to get import status for {participant_id}: {e}")
            return None
    
    def get_all_import_statuses(self) -> List[ImportRecord]:
        """Get all import status records."""
        try:
            collection = self.db.collection('import_status')
            results = list(collection.all())
            
            records = []
            for result in results:
                record = ImportRecord(
                    participant_id=result["participant_id"],
                    status=ImportStatus(result["status"]),
                    import_type=ImportType(result["import_type"]),
                    imported_at=result.get("imported_at"),
                    last_updated=result.get("last_updated"),
                    data_sources=result.get("data_sources"),
                    records_count=result.get("records_count"),
                    error_message=result.get("error_message"),
                    metadata=result.get("metadata")
                )
                records.append(record)
            
            return records
            
        except Exception as e:
            logger.error(f"Failed to get all import statuses: {e}")
            return []
    
    def get_participants_by_status(self, status: ImportStatus) -> List[str]:
        """Get participant IDs by import status."""
        try:
            collection = self.db.collection('import_status')
            aql_query = """
            FOR status IN import_status
                FILTER status.status == @status
                RETURN status.participant_id
            """
            
            cursor = self.db.aql.execute(aql_query, bind_vars={"status": status.value})
            return list(cursor)
            
        except Exception as e:
            logger.error(f"Failed to get participants by status {status.value}: {e}")
            return []
    
    def get_import_summary(self) -> Dict[str, Any]:
        """Get summary of import statuses."""
        try:
            collection = self.db.collection('import_status')
            aql_query = """
            FOR status IN import_status
                COLLECT status_type = status.status WITH COUNT INTO count
                RETURN {
                    status: status_type,
                    count: count
                }
            """
            
            cursor = self.db.aql.execute(aql_query)
            results = list(cursor)
            
            summary = {
                "total_participants": len(list(collection.all())),
                "by_status": {result["status"]: result["count"] for result in results}
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get import summary: {e}")
            return {}
    
    def create_import_job(self, participant_id: str, job_type: str, 
                         priority: int = 0, metadata: Dict[str, Any] = None) -> str:
        """Create an import job record."""
        try:
            import uuid
            job_id = str(uuid.uuid4())
            
            collection = self.db.collection('import_jobs')
            job_doc = {
                "_key": job_id,
                "id": job_id,
                "participant_id": participant_id,
                "job_type": job_type,
                "status": "queued",
                "priority": priority,
                "created_at": datetime.now().isoformat(),
                "started_at": None,
                "completed_at": None,
                "error_message": None,
                "metadata": metadata or {}
            }
            
            collection.insert(job_doc)
            logger.info(f"Created import job {job_id} for participant {participant_id}")
            return job_id
            
        except Exception as e:
            logger.error(f"Failed to create import job for {participant_id}: {e}")
            return ""
    
    def update_import_job_status(self, job_id: str, status: str, 
                               error_message: str = None) -> bool:
        """Update import job status."""
        try:
            collection = self.db.collection('import_jobs')
            
            update_data = {
                "status": status,
                "last_updated": datetime.now().isoformat()
            }
            
            if status == "running":
                update_data["started_at"] = datetime.now().isoformat()
            elif status in ["completed", "failed"]:
                update_data["completed_at"] = datetime.now().isoformat()
            
            if error_message:
                update_data["error_message"] = error_message
            
            collection.update({"_key": job_id}, update_data)
            logger.info(f"Updated import job {job_id} status to {status}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update import job {job_id}: {e}")
            return False
    
    def get_pending_import_jobs(self) -> List[Dict[str, Any]]:
        """Get all pending import jobs."""
        try:
            collection = self.db.collection('import_jobs')
            aql_query = """
            FOR job IN import_jobs
                FILTER job.status == "queued"
                SORT job.priority DESC, job.created_at ASC
                RETURN job
            """
            
            cursor = self.db.aql.execute(aql_query)
            return list(cursor)
            
        except Exception as e:
            logger.error(f"Failed to get pending import jobs: {e}")
            return []
