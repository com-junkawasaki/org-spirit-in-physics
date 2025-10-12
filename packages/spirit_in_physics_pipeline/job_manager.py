import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass

from arango import ArangoClient

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
        self.client = ArangoClient(hosts=config['url'])
        self.db = self.client.db(config['database'], username=config['user'], password=config['password'])
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
        
        # Insert job into ArangoDB collection
        collection = self.db.collection('analysis_jobs')
        job_data['_key'] = job_id
        result = collection.insert(job_data)
        
        logging.info(f"Created job {job_id} for response {response_id}, type {job_type.value}")
        return job_id

    def get_next_job(self) -> Optional[AnalysisJob]:
        """Get the next job to process based on priority and creation time."""
        # Find jobs that are ready to run (no pending dependencies)
        # For now, get the oldest queued job (simplified implementation)
        aql_query = """
        FOR job IN analysis_jobs
            FILTER job.status == "queued"
            SORT job.priority DESC, job.created_at ASC
            LIMIT 1
            RETURN job
        """

        cursor = self.db.aql.execute(aql_query)
        results = list(cursor)

        if not results:
            return None

        job_data = results[0]
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
        
        collection = self.db.collection('analysis_jobs')
        result = collection.update_match({"_key": job_id}, update_data)

    def retry_job(self, job_id: str) -> bool:
        """Retry a failed job if retry count is below max_retries."""
        # Get current job data
        collection = self.db.collection('analysis_jobs')
        job_data = collection.get(job_id)
        if not job_data:
            return False

        job = self._parse_job_data(job_data)
        
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
        
        result = collection.update_match({"_key": job_id}, update_data)
        
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
        
        collection = self.db.collection('analysis_cache')
        # Create unique key for cache entry
        cache_data['_key'] = f"{job_id}_{key}"
        result = collection.insert(cache_data, overwrite=True)  # Use overwrite for upsert behavior

    def get_cached_result(self, job_id: str, key: str) -> Optional[Any]:
        """Get cached intermediate results."""
        collection = self.db.collection('analysis_cache')
        cache_key = f"{job_id}_{key}"
        cache_entry = collection.get(cache_key)

        if not cache_entry:
            return None

        expires_at = datetime.fromisoformat(cache_entry['expires_at'])

        if datetime.now() > expires_at:
            # Cache expired, clean it up
            collection.delete(cache_key)
            return None

        return cache_entry['cache_value']

    def get_job_status(self, job_id: str) -> Optional[AnalysisJob]:
        """Get the current status of a job."""
        collection = self.db.collection('analysis_jobs')
        job_data = collection.get(job_id)

        if not job_data:
            return None

        return self._parse_job_data(job_data)

    def get_jobs_by_run(self, run_id: str) -> List[AnalysisJob]:
        """Get all jobs for a specific analysis run."""
        aql_query = """
        FOR job IN analysis_jobs
            FILTER job.run_id == @run_id
            SORT job.created_at ASC
            RETURN job
        """

        cursor = self.db.aql.execute(aql_query, bind_vars={"run_id": run_id})
        job_data_list = list(cursor)

        return [self._parse_job_data(job_data) for job_data in job_data_list]

    def add_job_dependency(self, job_id: str, depends_on_job_id: str) -> None:
        """Add a dependency between jobs."""
        dependency_data = {
            "job_id": job_id,
            "depends_on_job_id": depends_on_job_id
        }
        
        collection = self.db.collection('analysis_job_dependencies')
        # Create unique key for dependency
        dependency_data['_key'] = f"{job_id}_{depends_on_job_id}"
        result = collection.insert(dependency_data)

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
