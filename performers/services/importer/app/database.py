"""
Database connection pool management
Merkle DAG: import.service.database
"""
import logging
from typing import Optional

import asyncpg
from asyncpg import Pool

logger = logging.getLogger(__name__)

_db_pool: Optional[Pool] = None


async def init_db_pool(database_url: str) -> None:
    """Initialize database connection pool"""
    global _db_pool
    
    if _db_pool is not None:
        logger.warning("Database pool already initialized")
        return
    
    try:
        _db_pool = await asyncpg.create_pool(
            database_url,
            min_size=2,
            max_size=10,
            command_timeout=60
        )
        
        # Test connection
        async with _db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        
        logger.info("Database connection pool initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}")
        raise


async def get_db_pool() -> Pool:
    """Get database connection pool"""
    if _db_pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db_pool() first.")
    return _db_pool


async def close_db_pool() -> None:
    """Close database connection pool"""
    global _db_pool
    
    if _db_pool is not None:
        await _db_pool.close()
        _db_pool = None
        logger.info("Database connection pool closed")

