#!/usr/bin/env python3
"""
Import emotion data from CSV files to PostgreSQL
"""
import json
import sys
import os
import csv
import psycopg2
from psycopg2.extras import Json
from pathlib import Path
from datetime import datetime

def import_emotions_from_csv(participant_id, session_id, csv_path, csv_type, database_url):
    """Import emotion data from CSV file"""
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    try:
        participant_uuid = participant_id
        session_uuid = session_id
        
        # Read CSV file
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            
            for row in reader:
                # Extract emotion scores (all columns except Id, BeginTime, EndTime, etc.)
                emotion_scores = {}
                begin_time = float(row.get('BeginTime', 0))
                end_time = float(row.get('EndTime', begin_time + 1.0))
                
                # Extract all emotion columns
                for key, value in row.items():
                    if key not in ['Id', 'BeginTime', 'EndTime']:
                        try:
                            score = float(value)
                            if score > 0:  # Only include non-zero scores
                                emotion_scores[key] = score
                        except (ValueError, TypeError):
                            pass
                
                if not emotion_scores:
                    continue
                
                # Calculate time from begin_time (convert seconds to timestamp)
                # Use session start time as reference (approximate)
                time = datetime.utcnow()  # Will be adjusted based on session start
                
                if csv_type == 'burst.csv':
                    cur.execute("""
                        INSERT INTO burst_emotion_data (
                            time, session_id, participant_id, record_id, 
                            begin_time, end_time, emotion_scores, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT DO NOTHING
                    """, (
                        time, session_uuid, participant_uuid, row.get('Id', 'unknown'),
                        begin_time, end_time, Json(emotion_scores)
                    ))
                elif csv_type == 'face.csv':
                    cur.execute("""
                        INSERT INTO face_emotion_data (
                            time, session_id, participant_id, record_id,
                            begin_time, emotion_scores, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT DO NOTHING
                    """, (
                        time, session_uuid, participant_uuid, row.get('Id', 'unknown'),
                        begin_time, Json(emotion_scores)
                    ))
                elif csv_type == 'language.csv':
                    cur.execute("""
                        INSERT INTO language_emotion_data (
                            time, session_id, participant_id, record_id,
                            begin_time, end_time, emotion_scores, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT DO NOTHING
                    """, (
                        time, session_uuid, participant_uuid, row.get('Id', 'unknown'),
                        begin_time, end_time, Json(emotion_scores)
                    ))
                elif csv_type == 'prosody.csv':
                    cur.execute("""
                        INSERT INTO prosody_emotion_data (
                            time, session_id, participant_id, record_id,
                            begin_time, emotion_scores, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT DO NOTHING
                    """, (
                        time, session_uuid, participant_uuid, row.get('Id', 'unknown'),
                        begin_time, Json(emotion_scores)
                    ))
                
                count += 1
                if count % 100 == 0:
                    print(f'  Imported {count} records from {csv_type}...')
            
            conn.commit()
            print(f'✓ Imported {count} records from {csv_path}')
            return count
            
    except Exception as e:
        conn.rollback()
        print(f'Error importing {csv_path}: {e}')
        import traceback
        traceback.print_exc()
        return 0
    finally:
        cur.close()
        conn.close()

def find_csv_files(participant_path):
    """Find all CSV files in HumeAI artifacts directories"""
    csv_files = []
    participant_path = Path(participant_path)
    
    # Find HumeAI_artifacts directories
    for artifacts_dir in participant_path.glob('HumeAI_artifacts_*'):
        # Find registry_file directories
        for registry_dir in artifacts_dir.glob('registry_file-*'):
            csv_dir = registry_dir / 'csv'
            if csv_dir.exists():
                # Find subdirectories with CSV files
                for csv_subdir in csv_dir.iterdir():
                    if csv_subdir.is_dir():
                        for csv_file in csv_subdir.glob('*.csv'):
                            csv_files.append(csv_file)
    
    return csv_files

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python import_emotions_direct.py <participant_id> <session_id> [database_url]")
        sys.exit(1)
    
    participant_id = sys.argv[1]
    session_id = sys.argv[2]
    database_url = sys.argv[3] if len(sys.argv) > 3 else os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/spirit_in_physics'
    )
    
    # Find participant directory
    dataset_path = Path('apps/visualizer/public/dataset/participants') / participant_id
    if not dataset_path.exists():
        print(f"Participant directory not found: {dataset_path}")
        sys.exit(1)
    
    # Find all CSV files
    csv_files = find_csv_files(dataset_path)
    if not csv_files:
        print(f"No CSV files found for participant {participant_id}")
        sys.exit(1)
    
    print(f"Found {len(csv_files)} CSV files")
    
    total_count = 0
    for csv_file in csv_files:
        csv_type = csv_file.name
        count = import_emotions_from_csv(participant_id, session_id, csv_file, csv_type, database_url)
        total_count += count
    
    print(f'\n✓ Total: {total_count} emotion records imported')

