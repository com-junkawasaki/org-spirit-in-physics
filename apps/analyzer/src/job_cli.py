#!/usr/bin/env python3
"""
Command-line interface for managing Spirit in Physics analysis jobs.
"""

import argparse
import yaml
import logging
import asyncio
from typing import Optional

from pipeline.job_manager import JobManager, JobType, JobStatus
from pipeline.data_storer import DataStorer

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class JobCLI:
    def __init__(self, config_path: str = 'config.yaml'):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.job_manager = JobManager(self.config['terminusdb'])
        self.data_storer = DataStorer(self.config['terminusdb'])

    def create_run(self, model_version: str, notes: str = "") -> str:
        """Create a new analysis run."""
        run_id = self.data_storer.create_analysis_run(model_version, self.config['model_params'], notes)
        print(f"Created analysis run: {run_id}")
        return run_id

    def queue_jobs_for_run(self, run_id: str, response_ids: Optional[list] = None, limit: int = 10):
        """Queue analysis jobs for a run."""
        from pipeline.data_loader import DataLoader
        
        data_loader = DataLoader(self.config['terminusdb'])
        
        if response_ids:
            responses = [data_loader.get_response_with_media(rid) for rid in response_ids]
            responses = [r for r in responses if r is not None]
        else:
            responses = data_loader.get_unprocessed_responses(limit)
        
        print(f"Creating jobs for {len(responses)} responses...")
        
        for response in responses:
            # Create emotion analysis job
            emotion_job_id = self.job_manager.create_job(
                run_id, response['id'], JobType.EMOTION_ANALYSIS, 
                priority=2, metadata={'response_data': response}
            )
            
            # Create feature extraction job (depends on emotion analysis)
            feature_job_id = self.job_manager.create_job(
                run_id, response['id'], JobType.FEATURE_EXTRACTION,
                priority=1, metadata={'response_data': response}
            )
            
            # Create model calculation job (depends on feature extraction)
            model_job_id = self.job_manager.create_job(
                run_id, response['id'], JobType.MODEL_CALCULATION,
                priority=0, metadata={'response_data': response}
            )
            
            # Set up dependencies
            self.job_manager.add_job_dependency(feature_job_id, emotion_job_id)
            self.job_manager.add_job_dependency(model_job_id, feature_job_id)
            
            print(f"Queued jobs for response {response['id']}: emotion={emotion_job_id[:8]}..., feature={feature_job_id[:8]}..., model={model_job_id[:8]}...")

    def start_worker(self):
        """Start the job worker."""
        print("Starting job worker... (Press Ctrl+C to stop)")
        worker = JobWorker(self.config)
        asyncio.run(worker.run())

    def show_run_status(self, run_id: str):
        """Show the status of all jobs in a run."""
        jobs = self.job_manager.get_jobs_by_run(run_id)
        
        if not jobs:
            print(f"No jobs found for run {run_id}")
            return
        
        # Group by status
        status_counts = {}
        for job in jobs:
            status_counts[job.status.value] = status_counts.get(job.status.value, 0) + 1
        
        print(f"Run {run_id} - Total jobs: {len(jobs)}")
        for status, count in status_counts.items():
            print(f"  {status}: {count}")
        
        # Show recent jobs
        print("\nRecent jobs:")
        recent_jobs = sorted(jobs, key=lambda j: j.updated_at, reverse=True)[:5]
        for job in recent_jobs:
            print(f"  {job.id[:8]}... {job.job_type.value} {job.status.value} (updated: {job.updated_at})")

    def retry_failed_jobs(self, run_id: Optional[str] = None):
        """Retry failed jobs."""
        # This would be implemented using the database function
        print("Retrying failed jobs...")
        # Implementation would call the retry_failed_jobs() database function

    def cleanup_cache(self):
        """Clean up expired cache entries."""
        print("Cleaning up expired cache...")
        # Implementation would call the cleanup_expired_cache() database function

def main():
    parser = argparse.ArgumentParser(description="Spirit in Physics Job Management CLI")
    parser.add_argument('--config', default='config.yaml', help='Configuration file path')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Create run command
    create_parser = subparsers.add_parser('create-run', help='Create a new analysis run')
    create_parser.add_argument('--model-version', required=True, help='Model version')
    create_parser.add_argument('--notes', default='', help='Notes for the run')
    
    # Queue jobs command
    queue_parser = subparsers.add_parser('queue-jobs', help='Queue jobs for analysis')
    queue_parser.add_argument('--run-id', required=True, help='Run ID')
    queue_parser.add_argument('--response-ids', nargs='*', help='Specific response IDs to process')
    queue_parser.add_argument('--limit', type=int, default=10, help='Number of responses to process')
    
    # Start worker command
    subparsers.add_parser('start-worker', help='Start the job worker')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show run status')
    status_parser.add_argument('--run-id', required=True, help='Run ID')
    
    # Retry command
    retry_parser = subparsers.add_parser('retry', help='Retry failed jobs')
    retry_parser.add_argument('--run-id', help='Specific run ID to retry')
    
    # Cleanup command
    subparsers.add_parser('cleanup', help='Clean up expired cache')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cli = JobCLI(args.config)
    
    if args.command == 'create-run':
        cli.create_run(args.model_version, args.notes)
    elif args.command == 'queue-jobs':
        cli.queue_jobs_for_run(args.run_id, args.response_ids, args.limit)
    elif args.command == 'start-worker':
        cli.start_worker()
    elif args.command == 'status':
        cli.show_run_status(args.run_id)
    elif args.command == 'retry':
        cli.retry_failed_jobs(args.run_id if hasattr(args, 'run_id') else None)
    elif args.command == 'cleanup':
        cli.cleanup_cache()

if __name__ == '__main__':
    main()
