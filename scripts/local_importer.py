#!/usr/bin/env python3
"""
Local Data Importer for Spirit in Physics
Imports participant data from local dataset to cloud database.

Usage:
    python scripts/local_importer.py --database-url "postgresql://..." --dataset-path "./dataset/participants"
"""

import argparse
import asyncio
import csv
import json
import logging
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from uuid import UUID

import asyncpg

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Valid session_event_type_enum values from database schema
VALID_EVENT_TYPES = {
    'participant_initialized',
    'preflight_started',
    'preflight_devices_acquired',
    'recording_started',
    'recording_stopped_and_saved',
    'session_started',
    'word_displayed',
    'response_window_opened',
    'speech_detected',
    'response_window_closed',
    'session_data_saved',
    'session_1_completed',
    'session_1_video_saved',
    'session_2_completed',
    'test_completed',
    'test_reset',
    'media_recorder_setup_failed',
}


class LocalImporter:
    def __init__(self, database_url: str, dataset_path: str):
        self.database_url = database_url
        self.dataset_path = Path(dataset_path)
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """Connect to the database"""
        logger.info(f"Connecting to database...")
        self.pool = await asyncpg.create_pool(
            self.database_url,
            min_size=2,
            max_size=10,
            command_timeout=120
        )
        # Test connection
        async with self.pool.acquire() as conn:
            version = await conn.fetchval("SELECT version()")
            logger.info(f"Connected to database: {version[:50]}...")

    async def close(self):
        """Close the database connection"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection closed")

    async def import_all(self) -> Dict[str, Any]:
        """Import all participants from dataset"""
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset path not found: {self.dataset_path}")

        # Get all participant directories
        participant_dirs = [
            d for d in self.dataset_path.iterdir()
            if d.is_dir() and self._has_real_data(d)
        ]

        logger.info(f"Found {len(participant_dirs)} participants with real data")

        results = {
            'total': len(participant_dirs),
            'imported': 0,
            'skipped': 0,
            'errors': [],
            'participants': []
        }

        for participant_dir in participant_dirs:
            participant_id = participant_dir.name
            try:
                result = await self.import_participant(participant_dir)
                results['participants'].append(result)
                if result['status'] == 'success':
                    results['imported'] += 1
                else:
                    results['skipped'] += 1
            except Exception as e:
                logger.error(f"Error importing participant {participant_id}: {e}")
                results['errors'].append({
                    'participant_id': participant_id,
                    'error': str(e)
                })

        return results

    def _has_real_data(self, participant_dir: Path) -> bool:
        """Check if directory has real (non-annex-pointer) data files"""
        consent_path = participant_dir / "consent.json"
        if not consent_path.exists():
            return False

        # Check if file is a real file (not an annex pointer)
        try:
            with open(consent_path, 'r', encoding='utf-8') as f:
                content = f.read(20)
                if content.startswith('/annex'):
                    return False
            return True
        except Exception:
            return False

    async def import_participant(self, participant_dir: Path) -> Dict[str, Any]:
        """Import a single participant"""
        participant_id = participant_dir.name
        logger.info(f"Processing participant: {participant_id}")

        async with self.pool.acquire() as conn:
            # Check if participant already exists
            existing = await conn.fetchval(
                "SELECT id FROM participants WHERE id = $1",
                participant_id
            )

            if existing:
                logger.info(f"  Participant {participant_id} already exists, updating...")

            # Read consent.json
            consent_path = participant_dir / "consent.json"
            if not consent_path.exists():
                return {
                    'participant_id': participant_id,
                    'status': 'skipped',
                    'message': 'consent.json not found'
                }

            try:
                with open(consent_path, 'r', encoding='utf-8') as f:
                    consent_data = json.load(f)
            except json.JSONDecodeError as e:
                return {
                    'participant_id': participant_id,
                    'status': 'error',
                    'message': f'Invalid consent.json: {e}'
                }

            # Insert/update participant
            now = datetime.now(tz=timezone.utc)
            await conn.execute(
                """
                INSERT INTO participants (id, is_public, created_at, updated_at)
                VALUES ($1, true, $2, $2)
                ON CONFLICT (id) DO UPDATE SET updated_at = $2
                """,
                participant_id, now
            )
            logger.info(f"  Participant record created/updated")

            # Import session data
            session_result = await self._import_session(conn, participant_dir, participant_id)

            # Import emotion data if session was successful
            emotion_result = None
            if session_result.get('status') == 'success':
                emotion_result = await self._import_emotions(
                    conn, participant_dir, participant_id, session_result['session_id']
                )

            # Import physiological data
            physio_result = await self._import_physiological(
                conn, participant_dir, participant_id,
                session_result.get('session_id')
            )

            return {
                'participant_id': participant_id,
                'status': 'success',
                'message': 'Imported successfully',
                'session': session_result,
                'emotions': emotion_result,
                'physiological': physio_result
            }

    async def _import_session(self, conn, participant_dir: Path, participant_id: str) -> Dict[str, Any]:
        """Import session data from session_data.json"""
        session_data_path = participant_dir / "session_data.json"

        if not session_data_path.exists():
            return {'status': 'skipped', 'message': 'session_data.json not found'}

        try:
            with open(session_data_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if content.startswith('/annex'):
                    return {'status': 'skipped', 'message': 'session_data.json is annex pointer'}
                session_data = json.loads(content)
        except json.JSONDecodeError as e:
            return {'status': 'error', 'message': f'Invalid session_data.json: {e}'}

        events = session_data.get('events', [])
        if not events:
            return {'status': 'skipped', 'message': 'No events in session_data.json'}

        # Calculate session times
        start_ts = events[0].get('timestamp')
        end_event = next(
            (e for e in reversed(events) if e.get('type') == 'response_window_closed'),
            None
        )
        end_ts = end_event.get('timestamp') if end_event else events[-1].get('timestamp')

        # Insert or update session
        session_id = await conn.fetchval(
            """
            INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (participant_id, session_index) DO UPDATE SET
                start_ts = EXCLUDED.start_ts,
                end_ts = EXCLUDED.end_ts,
                updated_at = NOW()
            RETURNING id
            """,
            participant_id, 0, start_ts, end_ts
        )

        # Delete existing session events
        await conn.execute(
            "DELETE FROM session_events WHERE session_id = $1",
            session_id
        )

        # Build word_displayed map for reaction time calculation
        word_displayed_events = []
        for event in events:
            if event.get('type') == 'word_displayed':
                word = event.get('payload', {}).get('word')
                if word:
                    word_displayed_events.append((word, event.get('timestamp')))

        # Insert events
        inserted_count = 0
        for event in events:
            event_type = event.get('type')
            if event_type not in VALID_EVENT_TYPES:
                continue

            payload = event.get('payload', {})
            event_ts = event.get('timestamp', start_ts)

            reaction_time_ms = None
            if event_type == 'speech_detected':
                word = payload.get('word')
                if word:
                    matching = [ts for w, ts in word_displayed_events if w == word and ts < event_ts]
                    if matching:
                        reaction_time_ms = int(event_ts - max(matching))

            try:
                await conn.execute(
                    """
                    INSERT INTO session_events (
                        session_id, event_type, event_timestamp, event_data, reaction_time_ms
                    )
                    VALUES ($1, $2::session_event_type_enum, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                    """,
                    session_id,
                    event_type,
                    event_ts,
                    json.dumps(payload) if payload else None,
                    reaction_time_ms
                )
                inserted_count += 1
            except Exception as e:
                logger.warning(f"  Failed to insert event {event_type}: {e}")

        logger.info(f"  Session imported: {inserted_count} events")

        return {
            'status': 'success',
            'session_id': str(session_id),
            'events_count': inserted_count,
            'start_ts': start_ts,
            'end_ts': end_ts
        }

    async def _import_emotions(self, conn, participant_dir: Path, participant_id: str, session_id: str) -> Dict[str, Any]:
        """Import emotion data from HumeAI CSV files"""
        # Find HumeAI artifacts directory
        hume_dirs = list(participant_dir.glob("HumeAI_artifacts_*"))
        if not hume_dirs:
            return {'status': 'skipped', 'message': 'No HumeAI artifacts found'}

        total_imported = {
            'face': 0,
            'burst': 0,
            'language': 0,
            'prosody': 0
        }

        for hume_dir in hume_dirs:
            # Find registry files
            registry_dirs = list(hume_dir.glob("registry_file-*/csv/*"))

            for registry_dir in registry_dirs:
                for emotion_type in ['face', 'burst', 'language', 'prosody']:
                    csv_path = registry_dir / f"{emotion_type}.csv"
                    if csv_path.exists():
                        count = await self._import_emotion_csv(
                            conn, csv_path, session_id, participant_id, emotion_type
                        )
                        total_imported[emotion_type] += count

        logger.info(f"  Emotions imported: {total_imported}")
        return {
            'status': 'success',
            'counts': total_imported
        }

    async def _import_emotion_csv(self, conn, csv_path: Path, session_id: str,
                                   participant_id: str, file_type: str) -> int:
        """Import a single emotion CSV file"""
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                content = f.read(20)
                if content.startswith('/annex'):
                    return 0
        except Exception:
            return 0

        # Table mapping
        table_map = {
            'face': ('hume_face_emotion_data', 'hume_face_emotion_scores', 'hume_face_emotion_data_id'),
            'burst': ('hume_burst_emotion_data', 'hume_burst_emotion_scores', 'hume_burst_emotion_data_id'),
            'language': ('hume_language_emotion_data', 'hume_language_emotion_scores', 'hume_language_emotion_data_id'),
            'prosody': ('hume_prosody_emotion_data', 'hume_prosody_emotion_scores', 'hume_prosody_emotion_data_id'),
        }

        data_table, scores_table, fk_column = table_map[file_type]

        imported_count = 0

        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)

                for row in reader:
                    # Get time columns
                    begin_time = None
                    end_time = None

                    if 'Time' in row:
                        try:
                            begin_time = float(row['Time'])
                        except (ValueError, TypeError):
                            pass
                    elif 'BeginTime' in row:
                        try:
                            begin_time = float(row['BeginTime'])
                        except (ValueError, TypeError):
                            pass

                    if 'EndTime' in row:
                        try:
                            end_time = float(row['EndTime'])
                        except (ValueError, TypeError):
                            pass

                    # Insert data row
                    if file_type == 'face':
                        data_id = await conn.fetchval(
                            f"""
                            INSERT INTO {data_table} (session_id, participant_id, begin_time, created_at)
                            VALUES ($1::uuid, $2, $3, NOW())
                            RETURNING id
                            """,
                            session_id, participant_id, begin_time
                        )
                    else:
                        data_id = await conn.fetchval(
                            f"""
                            INSERT INTO {data_table} (session_id, participant_id, begin_time, end_time, created_at)
                            VALUES ($1::uuid, $2, $3, $4, NOW())
                            RETURNING id
                            """,
                            session_id, participant_id, begin_time, end_time
                        )

                    # Insert emotion scores
                    # Skip non-emotion columns
                    skip_columns = {'Id', 'Frame', 'Time', 'BeginTime', 'EndTime', 'Probability',
                                   'FaceX0', 'FaceY0', 'FaceWidth', 'FaceHeight', 'Text'}

                    for emotion_name, score_str in row.items():
                        if emotion_name in skip_columns or not score_str:
                            continue

                        # Skip AU (Action Unit) columns for now
                        if emotion_name.startswith('AU'):
                            continue

                        try:
                            score = float(score_str)
                            if score > 0.01:  # Only store significant scores
                                await conn.execute(
                                    f"""
                                    INSERT INTO {scores_table} ({fk_column}, emotion_name, score)
                                    VALUES ($1, $2, $3)
                                    ON CONFLICT DO NOTHING
                                    """,
                                    data_id, emotion_name, score
                                )
                        except (ValueError, TypeError):
                            continue

                    imported_count += 1

                    # Limit rows per file to avoid overwhelming the database
                    if imported_count >= 1000:
                        break

        except Exception as e:
            logger.warning(f"  Error importing {csv_path}: {e}")

        return imported_count

    async def _import_physiological(self, conn, participant_dir: Path,
                                     participant_id: str, session_id: Optional[str]) -> Dict[str, Any]:
        """Import physiological data from CSV file"""
        if not session_id:
            return {'status': 'skipped', 'message': 'No session ID'}

        # Find physiological CSV file (pattern: YYYY-MM-DD(*.CSV)
        csv_files = list(participant_dir.glob("*.CSV"))
        if not csv_files:
            return {'status': 'skipped', 'message': 'No physiological CSV found'}

        csv_path = csv_files[0]

        try:
            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                content = f.read(20)
                if content.startswith('/annex'):
                    return {'status': 'skipped', 'message': 'CSV is annex pointer'}
        except Exception:
            return {'status': 'error', 'message': 'Cannot read CSV'}

        try:
            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                lines = f.readlines()
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

        # Parse header metadata
        metadata = {}
        data_start_idx = 0
        for i, line in enumerate(lines):
            if not line.strip():
                continue
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 2:
                metadata[parts[0]] = parts[1]

            if "Time_Sec" in line:
                data_start_idx = i + 1
                break

        base_date_str = metadata.get("Date")
        begin_time_str = metadata.get("Begin")

        if not base_date_str or not begin_time_str:
            return {'status': 'error', 'message': 'Missing Date or Begin metadata'}

        # Parse base datetime
        try:
            h, m, s = map(int, begin_time_str.split(':'))
            base_dt = datetime.strptime(base_date_str, "%Y-%m-%d")
            base_dt = base_dt.replace(hour=h, minute=m, second=s, tzinfo=timezone.utc)
        except Exception as e:
            return {'status': 'error', 'message': f'Failed to parse Date/Begin: {e}'}

        # Clear existing data
        await conn.execute(
            "DELETE FROM physiological_data WHERE session_id = $1::uuid",
            session_id
        )

        # Parse and insert data rows
        inserted_count = 0
        for line in lines[data_start_idx:]:
            if not line.strip():
                continue
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 9:
                continue

            try:
                time_sec = float(parts[0])
                channels = [float(p) for p in parts[1:9]]

                row_time = base_dt + timedelta(seconds=time_sec)

                await conn.execute(
                    """
                    INSERT INTO physiological_data (
                        time, participant_id, session_id,
                        ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8
                    )
                    VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (time, participant_id, session_id) DO NOTHING
                    """,
                    row_time, participant_id, session_id,
                    *channels
                )
                inserted_count += 1

                # Limit rows
                if inserted_count >= 10000:
                    break

            except (ValueError, IndexError):
                continue

        logger.info(f"  Physiological data imported: {inserted_count} samples")
        return {
            'status': 'success',
            'samples_count': inserted_count
        }


async def main():
    parser = argparse.ArgumentParser(description='Import local dataset to cloud database')
    parser.add_argument(
        '--database-url',
        required=True,
        help='PostgreSQL database URL (e.g., postgresql://user:pass@host:port/dbname)'
    )
    parser.add_argument(
        '--dataset-path',
        default='./dataset/participants',
        help='Path to the dataset/participants directory'
    )
    parser.add_argument(
        '--participant',
        help='Import only a specific participant ID'
    )

    args = parser.parse_args()

    importer = LocalImporter(args.database_url, args.dataset_path)

    try:
        await importer.connect()

        if args.participant:
            participant_dir = Path(args.dataset_path) / args.participant
            if not participant_dir.exists():
                logger.error(f"Participant directory not found: {participant_dir}")
                sys.exit(1)
            result = await importer.import_participant(participant_dir)
            logger.info(f"Import result: {json.dumps(result, indent=2, default=str)}")
        else:
            results = await importer.import_all()
            logger.info(f"\n=== Import Summary ===")
            logger.info(f"Total participants: {results['total']}")
            logger.info(f"Successfully imported: {results['imported']}")
            logger.info(f"Skipped: {results['skipped']}")
            if results['errors']:
                logger.error(f"Errors: {len(results['errors'])}")
                for err in results['errors']:
                    logger.error(f"  - {err['participant_id']}: {err['error']}")

    finally:
        await importer.close()


if __name__ == '__main__':
    asyncio.run(main())
