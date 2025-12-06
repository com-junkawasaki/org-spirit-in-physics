#!/usr/bin/env python3
"""Test script to import sessions directly"""
import asyncio
import json
import os
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, '/app')

from app.database import get_db_pool
from app.routers.sessions import process_session, split_events_by_session

async def test_import():
    """Test importing sessions for a single participant"""
    participant_id = "144b325f-5966-4d59-a629-f2ca421388cc"
    dataset_path = Path("/app/dataset/participants")
    participant_path = dataset_path / participant_id
    
    # Test split_events_by_session
    session_data_path = participant_path / "session_data.json"
    with open(session_data_path, 'r', encoding='utf-8') as f:
        session_data = json.load(f)
    
    events = session_data.get('events', [])
    print(f"Total events: {len(events)}")
    
    sessions_dict = split_events_by_session(events)
    print(f"Found {len(sessions_dict)} sessions: {list(sessions_dict.keys())}")
    for session_num, session_events in sessions_dict.items():
        print(f"  Session {session_num}: {len(session_events)} events")
    
    # Test database import
    pool = await get_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                result = await process_session(conn, participant_id, participant_path)
                print(f"\nImport result:")
                print(f"  Status: {result.status}")
                print(f"  Message: {result.message}")
                if result.statistics:
                    print(f"  Statistics: {result.statistics}")
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(test_import())

