import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass

from supabase import create_client, Client

class JobStatus(Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class JobType(Enum):
    EMOTION_ANALYSIS = "emotion_analysis"
    FEATURE_EXTRACTION = "feature_extraction"
    MODEL_CALCULATION = "model_calculation"

@dataclass
class AnalysisJob:
    id: str
    run_id: str
    response_id: str
    job_type: JobType
    status: JobStatus
    priority: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    retry_count: int
    max_retries: int
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class JobManager:
    def __init__(self, config):
        self.supabase: Client = create_client(config['url'], config['service_role_key'])
        self.max_retries = config.get('max_retries', 3)
        logging.info("JobManager initialized.")

    def create_job(self, run_id: str, response_id: str, job_type: JobType, 
                   priority: int = 0, metadata: Dict[str, Any] = None) -> str:
        """Create a new analysis job."""
        job_id = str(uuid.uuid4())
        metadata = metadata or {}
        
        job_data = {
            "id": job_id,
            "run_id": run_id,
            "response_id": response_id,
            "job_type": job_type.value,
            "priority": priority,
            "metadata": metadata,
            "max_retries": self.max_retries
        }
        
        response = self.supabase.table('analysis_jobs').insert(job_data).execute()
        if response.error:
            raise Exception(f"Failed to create job: {response.error}")
        
        logging.info(f"Created job {job_id} for response {response_id}, type {job_type.value}")
        return job_id

    def get_next_job(self) -> Optional[AnalysisJob]:
        """Get the next job to process based on priority and creation time."""
        # Find jobs that are ready to run (no pending dependencies)
        response = self.supabase.rpc('get_next_ready_job').execute()
        
        if response.error or not response.data:
            return None
        
        job_data = response.data[0]
        return self._parse_job_data(job_data)

    def update_job_status(self, job_id: str, status: JobStatus, 
                         error_message: Optional[str] = None) -> None:
        """Update job status."""
        update_data = {
            "status": status.value,
            "updated_at": datetime.now().isoformat()
        }
        
        if status == JobStatus.RUNNING:
            update_data["started_at"] = datetime.now().isoformat()
        elif status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
            update_data["completed_at"] = datetime.now().isoformat()
            if error_message:
                update_data["error_message"] = error_message
        
        response = self.supabase.table('analysis_jobs').update(update_data).eq('id', job_id).execute()
        if response.error:
            logging.error(f"Failed to update job {job_id} status: {response.error}")

    def retry_job(self, job_id: str) -> bool:
        """Retry a failed job if retry count is below max_retries."""
        # Get current job data
        response = self.supabase.table('analysis_jobs').select('*').eq('id', job_id).execute()
        if response.error or not response.data:
            return False
        
        job = self._parse_job_data(response.data[0])
        
        if job.retry_count >= job.max_retries:
            logging.warning(f"Job {job_id} has exceeded max retries ({job.max_retries})")
            return False
        
        # Increment retry count and reset status
        update_data = {
            "status": JobStatus.QUEUED.value,
            "retry_count": job.retry_count + 1,
            "error_message": None,
            "started_at": None,
            "completed_at": None,
            "updated_at": datetime.now().isoformat()
        }
        
        response = self.supabase.table('analysis_jobs').update(update_data).eq('id', job_id).execute()
        if response.error:
            logging.error(f"Failed to retry job {job_id}: {response.error}")
            return False
        
        logging.info(f"Retrying job {job_id} (attempt {job.retry_count + 1}/{job.max_retries})")
        return True

    def cache_result(self, job_id: str, key: str, value: Any, ttl_hours: int = 24) -> None:
        """Cache intermediate results for durability."""
        expires_at = datetime.now() + timedelta(hours=ttl_hours)
        
        cache_data = {
            "job_id": job_id,
            "cache_key": key,
            "cache_value": value,
            "expires_at": expires_at.isoformat()
        }
        
        response = self.supabase.table('analysis_cache').upsert(cache_data, on_conflict="job_id,cache_key").execute()
        if response.error:
            logging.warning(f"Failed to cache result for job {job_id}: {response.error}")

    def get_cached_result(self, job_id: str, key: str) -> Optional[Any]:
        """Get cached intermediate results."""
        response = self.supabase.table('analysis_cache').select('cache_value, expires_at').eq('job_id', job_id).eq('cache_key', key).execute()
        
        if response.error or not response.data:
            return None
        
        cache_entry = response.data[0]
        expires_at = datetime.fromisoformat(cache_entry['expires_at'])
        
        if datetime.now() > expires_at:
            # Cache expired, clean it up
            self.supabase.table('analysis_cache').delete().eq('job_id', job_id).eq('cache_key', key).execute()
            return None
        
        return cache_entry['cache_value']

    def get_job_status(self, job_id: str) -> Optional[AnalysisJob]:
        """Get the current status of a job."""
        response = self.supabase.table('analysis_jobs').select('*').eq('id', job_id).execute()
        
        if response.error or not response.data:
            return None
        
        return self._parse_job_data(response.data[0])

    def get_jobs_by_run(self, run_id: str) -> List[AnalysisJob]:
        """Get all jobs for a specific analysis run."""
        response = self.supabase.table('analysis_jobs').select('*').eq('run_id', run_id).order('created_at').execute()
        
        if response.error:
            return []
        
        return [self._parse_job_data(job_data) for job_data in response.data]

    def add_job_dependency(self, job_id: str, depends_on_job_id: str) -> None:
        """Add a dependency between jobs."""
        dependency_data = {
            "job_id": job_id,
            "depends_on_job_id": depends_on_job_id
        }
        
        response = self.supabase.table('analysis_job_dependencies').insert(dependency_data).execute()
        if response.error:
            logging.error(f"Failed to add job dependency: {response.error}")

    def _parse_job_data(self, data: Dict[str, Any]) -> AnalysisJob:
        """Parse database job data into AnalysisJob object."""
        return AnalysisJob(
            id=data['id'],
            run_id=data['run_id'],
            response_id=data['response_id'],
            job_type=JobType(data['job_type']),
            status=JobStatus(data['status']),
            priority=data['priority'],
            started_at=data.get('started_at'),
            completed_at=data.get('completed_at'),
            error_message=data.get('error_message'),
            retry_count=data['retry_count'],
            max_retries=data['max_retries'],
            metadata=data.get('metadata', {}),
            created_at=data['created_at'],
            updated_at=data['updated_at']
        )
