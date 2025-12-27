#!/usr/bin/env python3
"""
Import Service - Python implementation
Merkle DAG: import.service.main
Import service HTTP server using FastAPI + PostgreSQL + Temporal
"""
import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from temporalio.client import Client

from app.database import get_db_pool, init_db_pool, close_db_pool
from app.routers import participants, sessions, emotions, timeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting import service...")
    
    # DB initialization
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@postgres:5432/spirit_in_physics'
    )
    logger.info(f"Connecting to database: {database_url.split('@')[-1]}")
    await init_db_pool(database_url)
    
    # Temporal initialization
    temporal_address = os.getenv("TEMPORAL_ADDRESS", "infra-temporal:7233")
    try:
        app.state.temporal_client = await Client.connect(temporal_address)
        logger.info(f"Connected to Temporal at {temporal_address}")
    except Exception as e:
        logger.error(f"Failed to connect to Temporal: {e}")
        app.state.temporal_client = None
    
    yield
    
    # Shutdown
    logger.info("Shutting down import service...")
    await close_db_pool()
    logger.info("Database connection pool closed")


app = FastAPI(
    title="Import Service",
    description="Data import service for spirit-in-physics using Temporal",
    version="2.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(participants.router, prefix="/import", tags=["participants"])
app.include_router(sessions.router, prefix="/import", tags=["sessions"])
app.include_router(emotions.router, prefix="/import", tags=["emotions"])
app.include_router(timeline.router, prefix="/import", tags=["timeline"])


@app.get("/import/status")
async def get_status():
    """Health check endpoint"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute("SELECT 1")
        
        temporal_status = "connected" if hasattr(app.state, "temporal_client") and app.state.temporal_client else "disconnected"
        
        return {
            "status": "ok",
            "service": "import-service",
            "version": "2.1.0",
            "temporal": temporal_status
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unavailable: {str(e)}"
        )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "import-service",
        "version": "2.1.0",
        "endpoints": [
            "/import/status",
            "/import/participants",
            "/import/sessions",
            "/import/emotions",
            "/import/timeline"
        ]
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8082"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=False
    )
