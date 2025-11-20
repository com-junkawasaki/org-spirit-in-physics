#!/usr/bin/env python3
"""
Update timeline_points word column from session_data.json
"""
import json
import asyncio
import asyncpg
import os
from pathlib import Path

async def update_timeline_words():
    # Database connection
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@postgres:5432/spirit_in_physics')
    conn = await asyncpg.connect(database_url)
    
    try:
        # Get session info
        session_id = '116ff951-676e-49eb-8470-c7f4e099f50a'
        participant_id = '5346d514-e501-457a-aff1-55c92074a6f2'
        
        # Load session_data.json
        dataset_path = os.getenv('DATASET_PATH', '/app/dataset')
        participant_path = Path(dataset_path) / participant_id
        session_data_path = participant_path / 'session_data.json'
        
        if not session_data_path.exists():
            print(f"Error: session_data.json not found at {session_data_path}")
            return
        
        with open(session_data_path, 'r', encoding='utf-8') as f:
            session_data = json.load(f)
        
        # Build word map from word_displayed events
        word_map = {}
        events = session_data.get('events', [])
        for event in events:
            if event.get('type') == 'word_displayed':
                timestamp = event.get('timestamp')
                payload = event.get('payload', {})
                word = payload.get('word')
                if timestamp and word:
                    word_map[timestamp] = word
        
        print(f"Loaded {len(word_map)} words from session_data.json")
        
        # Get timeline_points and update words
        timeline_points = await conn.fetch(
            """
            SELECT time, word
            FROM timeline_points
            WHERE session_id = $1::uuid
            ORDER BY time
            """,
            session_id
        )
        
        print(f"Found {len(timeline_points)} timeline points")
        
        # Update words by matching timestamps
        updated_count = 0
        for tp in timeline_points:
            # Convert time to timestamp (milliseconds)
            time_dt = tp['time']
            timestamp_ms = int(time_dt.timestamp() * 1000)
            
            # Find matching word from word_map (allow ±100ms tolerance)
            matched_word = None
            for ts, word in word_map.items():
                if abs(ts - timestamp_ms) < 100:
                    matched_word = word
                    break
            
            if matched_word and matched_word != 'Unknown':
                await conn.execute(
                    """
                    UPDATE timeline_points
                    SET word = $1
                    WHERE session_id = $2::uuid AND time = $3
                    """,
                    matched_word, session_id, time_dt
                )
                updated_count += 1
        
        print(f"Updated {updated_count} timeline points with words")
        
        # Verify update
        result = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT word) 
            FROM timeline_points 
            WHERE session_id = $1::uuid AND word != 'Unknown'
            """,
            session_id
        )
        print(f"Unique non-Unknown words: {result}")
        
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(update_timeline_words())

