#!/usr/bin/env python3
"""
Import Service - Prefect Workflow Implementation
Merkle DAG: import.service.main
Prefect-based data import pipeline for spirit-in-physics
"""
import os
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from prefect import serve
from prefect.server.server import create_app

from app.database import get_db_pool, init_db_pool, close_db_pool
from app.workflows import process_emotions_workflow, process_all_participants_workflow

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def init_database():
    """Initialize database connection pool"""
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@postgres:5432/spirit_in_physics'
    )
    logger.info(f"Connecting to database: {database_url.split('@')[-1]}")
    
    await init_db_pool(database_url)
    logger.info("PostgreSQL connection pool initialized")


async def cleanup_database():
    """Close database connection pool"""
    logger.info("Shutting down import service...")
    await close_db_pool()
    logger.info("Database connection pool closed")


if __name__ == "__main__":
    import sys
    
    # Initialize database
    asyncio.run(init_database())
    
    # Check if running as Prefect server or workflow execution
    if len(sys.argv) > 1 and sys.argv[1] == "server":
        # Start Prefect server
        logger.info("Starting Prefect server...")
        from prefect.server.server import create_app
        import uvicorn
        
        app = create_app()
        port = int(os.getenv("PREFECT_SERVER_PORT", "4200"))
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port,
            log_level="info"
        )
    elif len(sys.argv) > 1 and sys.argv[1] == "workflow":
        # Run workflow directly
        participant_id = sys.argv[2] if len(sys.argv) > 2 else None
        
        if participant_id:
            logger.info(f"Running emotion workflow for participant {participant_id}")
            result = asyncio.run(process_emotions_workflow(participant_id))
            logger.info(f"Workflow completed: {result}")
        else:
            logger.info("Running emotion workflow for all participants")
            result = asyncio.run(process_all_participants_workflow())
            logger.info(f"Workflow completed: {result}")
        
        # Cleanup
        asyncio.run(cleanup_database())
    else:
        # Default: serve workflows using Prefect serve
        logger.info("Serving Prefect workflows...")
        logger.info("Use 'python main.py server' to start Prefect server")
        logger.info("Use 'python main.py workflow [participant_id]' to run workflow directly")
        logger.info("Or use Prefect CLI: 'prefect deploy' to deploy workflows")
        
        # Note: For Prefect 2.x, workflows are typically deployed using:
        # prefect deploy app/workflows/emotions.py:process_emotions_workflow
        # prefect deploy app/workflows/participants.py:process_all_participants_workflow
        # Then run with: prefect run flow 'process-emotions' --param participant_id=<id>
