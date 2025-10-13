#!/usr/bin/env python3
"""
Batch Import Manager for Spirit in Physics Pipeline

This module provides functionality for batch importing multiple participants
with comprehensive error handling and retry mechanisms.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import yaml
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from packages.spirit_in_physics_pipeline.import_status_manager import ImportStatusManager, ImportStatus, ImportType
from packages.spirit_in_physics_pipeline.arangodb_client import ArangoDBClient

logger = logging.getLogger(__name__)

class BatchStatus(Enum):
    """Batch import status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"

@dataclass
class BatchImportResult:
    """Result of a batch import operation."""
    batch_id: str
    status: BatchStatus
    total_participants: int
    successful: int
    failed: int
    failed_participants: List[str]
    start_time: datetime
    end_time: Optional[datetime]
    error_message: Optional[str]
    results: List[Dict[str, Any]]

class BatchImportManager:
    """Manager for batch import operations."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.status_manager = ImportStatusManager(config['arangodb'])
        self.arangodb_client = ArangoDBClient(
            server_url=config['arangodb']['url'],
            user=config['arangodb']['user'],
            password=config['arangodb']['password']
        )
        self.max_concurrent = config.get('batch_import', {}).get('max_concurrent', 3)
        self.retry_attempts = config.get('batch_import', {}).get('retry_attempts', 3)
        self.retry_delay = config.get('batch_import', {}).get('retry_delay', 60)
        
    async def import_participant_batch(self, participant_ids: List[str], 
                                     import_type: str = "participant_data",
                                     data_sources: List[str] = None) -> BatchImportResult:
        """Import a batch of participants with error handling and retry."""
        batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.now()
        
        logger.info(f"Starting batch import {batch_id} for {len(participant_ids)} participants")
        
        # Create batch status
        await self._create_batch_status(batch_id, participant_ids, import_type)
        
        try:
            # Update batch status to running
            await self._update_batch_status(batch_id, BatchStatus.RUNNING)
            
            # Process participants in batches
            results = []
            failed_participants = []
            
            for i in range(0, len(participant_ids), self.max_concurrent):
                batch = participant_ids[i:i + self.max_concurrent]
                batch_results = await self._process_participant_batch(
                    batch, import_type, data_sources
                )
                
                results.extend(batch_results)
                failed_participants.extend([
                    r['participant_id'] for r in batch_results 
                    if r['status'] == 'FAILED'
                ])
                
                # Log progress
                logger.info(f"Processed batch {i//self.max_concurrent + 1}, "
                          f"successful: {len([r for r in batch_results if r['status'] == 'SUCCESS'])}, "
                          f"failed: {len([r for r in batch_results if r['status'] == 'FAILED'])}")
            
            # Calculate final results
            successful = len([r for r in results if r['status'] == 'SUCCESS'])
            failed = len(failed_participants)
            
            if failed == 0:
                final_status = BatchStatus.COMPLETED
            elif successful == 0:
                final_status = BatchStatus.FAILED
            else:
                final_status = BatchStatus.PARTIAL
            
            end_time = datetime.now()
            
            result = BatchImportResult(
                batch_id=batch_id,
                status=final_status,
                total_participants=len(participant_ids),
                successful=successful,
                failed=failed,
                failed_participants=failed_participants,
                start_time=start_time,
                end_time=end_time,
                error_message=None,
                results=results
            )
            
            # Update batch status
            await self._update_batch_status(batch_id, final_status, result)
            
            logger.info(f"Batch import {batch_id} completed: {successful} successful, {failed} failed")
            return result
            
        except Exception as e:
            end_time = datetime.now()
            error_message = str(e)
            
            result = BatchImportResult(
                batch_id=batch_id,
                status=BatchStatus.FAILED,
                total_participants=len(participant_ids),
                successful=0,
                failed=len(participant_ids),
                failed_participants=participant_ids,
                start_time=start_time,
                end_time=end_time,
                error_message=error_message,
                results=[]
            )
            
            await self._update_batch_status(batch_id, BatchStatus.FAILED, result)
            
            logger.error(f"Batch import {batch_id} failed: {error_message}")
            return result
    
    async def _process_participant_batch(self, participant_ids: List[str], 
                                       import_type: str, data_sources: List[str]) -> List[Dict[str, Any]]:
        """Process a batch of participants concurrently."""
        tasks = []
        
        for participant_id in participant_ids:
            task = self._import_single_participant(participant_id, import_type, data_sources)
            tasks.append(task)
        
        # Wait for all tasks to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    'participant_id': participant_ids[i],
                    'status': 'FAILED',
                    'error': str(result)
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def _import_single_participant(self, participant_id: str, 
                                        import_type: str, data_sources: List[str]) -> Dict[str, Any]:
        """Import a single participant with retry logic."""
        for attempt in range(self.retry_attempts):
            try:
                # Create import status
                await self.status_manager.create_import_status(
                    participant_id, ImportType(import_type), data_sources
                )
                
                # Update status to in_progress
                await self.status_manager.update_import_status(
                    participant_id, ImportStatus.IN_PROGRESS
                )
                
                # Perform actual import
                result = await self._perform_import(participant_id, data_sources)
                
                if result['success']:
                    # Update status to completed
                    await self.status_manager.update_import_status(
                        participant_id, ImportStatus.COMPLETED,
                        records_count=result['records_count'],
                        metadata=result['metadata']
                    )
                    
                    return {
                        'participant_id': participant_id,
                        'status': 'SUCCESS',
                        'records_count': result['records_count'],
                        'metadata': result['metadata']
                    }
                else:
                    # Update status to failed
                    await self.status_manager.update_import_status(
                        participant_id, ImportStatus.FAILED,
                        error_message=result['error_message']
                    )
                    
                    return {
                        'participant_id': participant_id,
                        'status': 'FAILED',
                        'error': result['error_message']
                    }
                    
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed for {participant_id}: {e}")
                
                if attempt == self.retry_attempts - 1:
                    # Final attempt failed
                    await self.status_manager.update_import_status(
                        participant_id, ImportStatus.FAILED,
                        error_message=str(e)
                    )
                    
                    return {
                        'participant_id': participant_id,
                        'status': 'FAILED',
                        'error': str(e)
                    }
                else:
                    # Wait before retry
                    await asyncio.sleep(self.retry_delay)
        
        # This should never be reached
        return {
            'participant_id': participant_id,
            'status': 'FAILED',
            'error': 'Unexpected error in retry logic'
        }
    
    async def _perform_import(self, participant_id: str, data_sources: List[str]) -> Dict[str, Any]:
        """Perform the actual import operation."""
        try:
            # This is a placeholder for actual import logic
            # In a real implementation, this would:
            # 1. Load participant data from files
            # 2. Validate data
            # 3. Transform data
            # 4. Insert into database
            # 5. Update related collections
            
            # Simulate import process
            await asyncio.sleep(2)  # Simulate processing time
            
            # Mock successful result
            return {
                'success': True,
                'records_count': {
                    'sessions': 2,
                    'responses': 100,
                    'hume_data': 50,
                    'physiological_data': 25
                },
                'metadata': {
                    'import_duration': '2 seconds',
                    'data_sources': data_sources or ['session_data.json', 'consent.json'],
                    'imported_at': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    async def _create_batch_status(self, batch_id: str, participant_ids: List[str], import_type: str):
        """Create batch status record."""
        try:
            if not self.arangodb_client.db:
                self.arangodb_client.connect()
            
            collection = self.arangodb_client.db.collection('batch_imports')
            batch_doc = {
                '_key': batch_id,
                'batch_id': batch_id,
                'status': BatchStatus.PENDING.value,
                'total_participants': len(participant_ids),
                'participant_ids': participant_ids,
                'import_type': import_type,
                'created_at': datetime.now().isoformat(),
                'started_at': None,
                'completed_at': None,
                'successful': 0,
                'failed': 0,
                'failed_participants': [],
                'error_message': None,
                'results': []
            }
            
            collection.insert(batch_doc)
            logger.info(f"Created batch status record for {batch_id}")
            
        except Exception as e:
            logger.error(f"Failed to create batch status for {batch_id}: {e}")
    
    async def _update_batch_status(self, batch_id: str, status: BatchStatus, result: BatchImportResult = None):
        """Update batch status record."""
        try:
            if not self.arangodb_client.db:
                self.arangodb_client.connect()
            
            collection = self.arangodb_client.db.collection('batch_imports')
            
            update_data = {
                'status': status.value,
                'last_updated': datetime.now().isoformat()
            }
            
            if status == BatchStatus.RUNNING:
                update_data['started_at'] = datetime.now().isoformat()
            elif status in [BatchStatus.COMPLETED, BatchStatus.FAILED, BatchStatus.PARTIAL]:
                update_data['completed_at'] = datetime.now().isoformat()
            
            if result:
                update_data.update({
                    'successful': result.successful,
                    'failed': result.failed,
                    'failed_participants': result.failed_participants,
                    'error_message': result.error_message,
                    'results': result.results
                })
            
            collection.update({'_key': batch_id}, update_data)
            logger.info(f"Updated batch status for {batch_id}: {status.value}")
            
        except Exception as e:
            logger.error(f"Failed to update batch status for {batch_id}: {e}")
    
    async def get_batch_status(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """Get batch status by ID."""
        try:
            if not self.arangodb_client.db:
                self.arangodb_client.connect()
            
            collection = self.arangodb_client.db.collection('batch_imports')
            result = collection.find({'_key': batch_id})
            records = list(result)
            
            if records:
                return records[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to get batch status for {batch_id}: {e}")
            return None
    
    async def get_all_batch_statuses(self) -> List[Dict[str, Any]]:
        """Get all batch status records."""
        try:
            if not self.arangodb_client.db:
                self.arangodb_client.connect()
            
            collection = self.arangodb_client.db.collection('batch_imports')
            results = list(collection.all())
            return results
            
        except Exception as e:
            logger.error(f"Failed to get all batch statuses: {e}")
            return []
    
    async def retry_failed_participants(self, batch_id: str) -> BatchImportResult:
        """Retry failed participants from a batch."""
        try:
            batch_status = await self.get_batch_status(batch_id)
            if not batch_status:
                raise ValueError(f"Batch {batch_id} not found")
            
            failed_participants = batch_status.get('failed_participants', [])
            if not failed_participants:
                raise ValueError(f"No failed participants in batch {batch_id}")
            
            logger.info(f"Retrying {len(failed_participants)} failed participants from batch {batch_id}")
            
            # Create new batch for retry
            retry_batch_id = f"retry_{batch_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            result = await self.import_participant_batch(
                failed_participants,
                batch_status.get('import_type', 'participant_data'),
                batch_status.get('data_sources', [])
            )
            
            # Update original batch with retry results
            if result.status == BatchStatus.COMPLETED:
                # All retries successful
                await self._update_batch_status(batch_id, BatchStatus.COMPLETED, result)
            elif result.successful > 0:
                # Some retries successful
                await self._update_batch_status(batch_id, BatchStatus.PARTIAL, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to retry participants for batch {batch_id}: {e}")
            raise

def load_config():
    """Load configuration from config.yaml."""
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

async def main():
    """Main entry point for testing."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Batch Import Manager")
    parser.add_argument('--participants', nargs='+', required=True, help='Participant IDs to import')
    parser.add_argument('--import-type', default='participant_data', help='Import type')
    parser.add_argument('--data-sources', nargs='+', help='Data sources')
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config()
    
    # Create manager
    manager = BatchImportManager(config)
    
    # Run batch import
    result = await manager.import_participant_batch(
        args.participants,
        args.import_type,
        args.data_sources
    )
    
    print(f"Batch import completed:")
    print(f"  Batch ID: {result.batch_id}")
    print(f"  Status: {result.status.value}")
    print(f"  Total: {result.total_participants}")
    print(f"  Successful: {result.successful}")
    print(f"  Failed: {result.failed}")
    print(f"  Duration: {result.end_time - result.start_time if result.end_time else 'N/A'}")

if __name__ == "__main__":
    asyncio.run(main())
