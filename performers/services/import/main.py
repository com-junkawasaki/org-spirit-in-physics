#!/usr/bin/env python3
"""
Import Service - Prefect Workflow Implementation
Merkle DAG: import.service.main
Prefect-based data import pipeline for spirit-in-physics
"""
import os
import logging
import asyncio
import sys
from typing import Optional

from app.database import init_db_pool, close_db_pool
from app.workflows.emotions import process_emotions_workflow
from app.workflows.participants import process_all_participants_workflow

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Main entry point for import service"""
    # Initialize database
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@postgres:5432/spirit_in_physics'
    )
    logger.info(f"Connecting to database: {database_url.split('@')[-1]}")
    
    await init_db_pool(database_url)
    logger.info("PostgreSQL connection pool initialized")
    
    try:
        # Check command line arguments
        if len(sys.argv) > 1 and sys.argv[1] == "workflow":
            # Run workflow directly
            participant_id = sys.argv[2] if len(sys.argv) > 2 else None
            
            if participant_id:
                logger.info(f"Running emotion workflow for participant {participant_id}")
                result = await process_emotions_workflow(participant_id)
                logger.info(f"Workflow completed: {result}")
            else:
                logger.info("Running emotion workflow for all participants")
                result = await process_all_participants_workflow()
                logger.info(f"Workflow completed: {result}")
        else:
            # Default: keep service running (for future API endpoints or scheduled tasks)
            logger.info("Import service started. Waiting for workflow execution...")
            logger.info("Use 'python main.py workflow [participant_id]' to run workflow directly")
            logger.info("Or use Prefect CLI: 'prefect deploy' to deploy workflows")
            
            # Keep service running
            while True:
                await asyncio.sleep(60)  # Sleep for 1 minute
    finally:
        # Cleanup
        logger.info("Shutting down import service...")
        await close_db_pool()
        logger.info("Database connection pool closed")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service interrupted by user")
    except Exception as e:
        logger.error(f"Service error: {e}", exc_info=True)
        sys.exit(1)
