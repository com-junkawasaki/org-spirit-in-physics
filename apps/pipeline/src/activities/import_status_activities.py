#!/usr/bin/env python3
"""
Import Status Activities for Serverless Workflows

This module provides activities for managing import status
during workflow execution.
"""

import sys
import os
import logging
from datetime import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from packages.spirit_in_physics_pipeline.import_status_manager import ImportStatusManager, ImportStatus, ImportType

logger = logging.getLogger(__name__)

class ImportStatusActivities:
    """Temporal activities for import status management."""
    
    def __init__(self, config):
        self.status_manager = ImportStatusManager(config['arangodb'])
        self.config = config
    
    async def
    async def create_import_status(self, participant_id: str, import_type: str, data_sources: list = None) -> bool:
        """Create import status for a participant."""
        logger.info(f"Creating import status for participant: {participant_id}")
        
        try:
            import_type_enum = ImportType(import_type)
            success = self.status_manager.create_import_status(
                participant_id, import_type_enum, data_sources
            )
            
            if success:
                logger.info(f"Successfully created import status for {participant_id}")
            else:
                logger.error(f"Failed to create import status for {participant_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error creating import status for {participant_id}: {e}")
            return False
    
    async def
    async def update_import_status(self, participant_id: str, status: str, 
                                 error_message: str = None, records_count: dict = None,
                                 metadata: dict = None) -> bool:
        """Update import status for a participant."""
        logger.info(f"Updating import status for {participant_id}: {status}")
        
        try:
            status_enum = ImportStatus(status)
            success = self.status_manager.update_import_status(
                participant_id, status_enum, error_message, records_count, metadata
            )
            
            if success:
                logger.info(f"Successfully updated import status for {participant_id}")
            else:
                logger.error(f"Failed to update import status for {participant_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error updating import status for {participant_id}: {e}")
            return False
    
    async def
    async def create_import_job(self, participant_id: str, job_type: str, 
                              priority: int = 0, metadata: dict = None) -> str:
        """Create an import job."""
        logger.info(f"Creating import job for participant: {participant_id}")
        
        try:
            job_id = self.status_manager.create_import_job(
                participant_id, job_type, priority, metadata
            )
            
            if job_id:
                logger.info(f"Successfully created import job {job_id} for {participant_id}")
            else:
                logger.error(f"Failed to create import job for {participant_id}")
            
            return job_id
            
        except Exception as e:
            logger.error(f"Error creating import job for {participant_id}: {e}")
            return ""
    
    async def
    async def update_import_job_status(self, job_id: str, status: str, 
                                      error_message: str = None) -> bool:
        """Update import job status."""
        logger.info(f"Updating import job {job_id} status to {status}")
        
        try:
            success = self.status_manager.update_import_job_status(
                job_id, status, error_message
            )
            
            if success:
                logger.info(f"Successfully updated import job {job_id}")
            else:
                logger.error(f"Failed to update import job {job_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error updating import job {job_id}: {e}")
            return False
    
    async def
    async def get_import_status(self, participant_id: str) -> dict:
        """Get import status for a participant."""
        logger.info(f"Getting import status for participant: {participant_id}")
        
        try:
            status = self.status_manager.get_import_status(participant_id)
            
            if status:
                return {
                    "participant_id": status.participant_id,
                    "status": status.status.value,
                    "import_type": status.import_type.value,
                    "imported_at": status.imported_at,
                    "last_updated": status.last_updated,
                    "data_sources": status.data_sources,
                    "records_count": status.records_count,
                    "error_message": status.error_message,
                    "metadata": status.metadata
                }
            else:
                return {}
                
        except Exception as e:
            logger.error(f"Error getting import status for {participant_id}: {e}")
            return {}
    
    async def
    async def get_pending_import_jobs(self) -> list:
        """Get all pending import jobs."""
        logger.info("Getting pending import jobs")
        
        try:
            jobs = self.status_manager.get_pending_import_jobs()
            logger.info(f"Found {len(jobs)} pending import jobs")
            return jobs
            
        except Exception as e:
            logger.error(f"Error getting pending import jobs: {e}")
            return []
    
    async def
    async def get_import_summary(self) -> dict:
        """Get import status summary."""
        logger.info("Getting import status summary")
        
        try:
            summary = self.status_manager.get_import_summary()
            logger.info(f"Import summary: {summary}")
            return summary
            
        except Exception as e:
            logger.error(f"Error getting import summary: {e}")
            return {}
