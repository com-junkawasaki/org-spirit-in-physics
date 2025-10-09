import logging
import uuid
from enum import Enum
from datetime import datetime

class JobType(Enum):
    """Types of analysis jobs"""
    SPIRIT_ANALYSIS = "spirit_analysis"
    HUME_PROCESSING = "hume_processing"
    DATA_VALIDATION = "data_validation"

class JobStatus(Enum):
    """Job status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class JobManager:
    """Simple job manager for analysis jobs"""

    def __init__(self, config):
        self.jobs = {}
        self.config = config
        logging.info("JobManager initialized")

    def create_job(self, job_type, parameters=None):
        """Create a new job"""
        job_id = str(uuid.uuid4())
        job = {
            "id": job_id,
            "type": job_type,
            "status": JobStatus.PENDING,
            "parameters": parameters or {},
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        self.jobs[job_id] = job
        logging.info(f"Created job {job_id} of type {job_type}")
        return job

    def get_job(self, job_id):
        """Get job by ID"""
        return self.jobs.get(job_id)

    def update_job_status(self, job_id, status, result=None):
        """Update job status"""
        if job_id in self.jobs:
            self.jobs[job_id]["status"] = status
            self.jobs[job_id]["updated_at"] = datetime.now()
            if result is not None:
                self.jobs[job_id]["result"] = result
            logging.info(f"Updated job {job_id} status to {status}")

    def list_jobs(self, job_type=None, status=None):
        """List jobs with optional filtering"""
        jobs = list(self.jobs.values())

        if job_type:
            jobs = [j for j in jobs if j["type"] == job_type]

        if status:
            jobs = [j for j in jobs if j["status"] == status]

        return jobs
