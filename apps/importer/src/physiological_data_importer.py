#!/usr/bin/env python3
"""
Physiological Data Importer for ArangoDB
Imports CSV physiological data files into the response_skin_potential_timeseries collection.
"""

import csv
import json
import logging
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import os

# Add src directory to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

try:
    from arango import ArangoClient
except ImportError:
    logging.error("python-arango not installed. Please install with: pip install python-arango")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class PhysiologicalDataImporter:
    """
    Imports physiological data from CSV files into ArangoDB.
    """

    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.db = self._create_arangodb_client()

    def _create_arangodb_client(self):
        """Create ArangoDB client for local development."""
        # Use ArangoDB configuration
        arangodb_config = self.config.get('arangodb', {})
        arangodb_url = arangodb_config.get('url', 'http://localhost:8529')
        arangodb_user = arangodb_config.get('user', 'root')
        arangodb_password = arangodb_config.get('password', '')
        arangodb_database = arangodb_config.get('database', 'spirit_in_physics')

        client = ArangoClient(hosts=arangodb_url)
        return client.db(arangodb_database, username=arangodb_user, password=arangodb_password)

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        try:
            import yaml
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logging.warning(f"Could not load config from {config_path}: {e}")
            return {}

    def parse_mod002_csv(self, csv_path: str) -> Dict[str, Any]:
        """
        Parse Mod-002 physiological data CSV file.

        Expected format:
        - Header lines with metadata
        - Data lines: Time_Sec,Ch1,Ch2,Ch3,Ch4,Ch5,Ch6,Ch7,Ch8

        Returns:
        {
            'metadata': {...},
            'data': [{'timestamp_offset_ms': int, 'value': float}, ...]
        }
        """
        metadata = {}
        data_points = []

        logging.info(f"Parsing physiological data from: {csv_path}")

        with open(csv_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Parse metadata (first few lines)
        for i, line in enumerate(lines[:20]):  # Check first 20 lines for metadata
            line = line.strip()
            if not line:
                continue

            # Skip data header
            if line.startswith('Measurement Record'):
                break

            # Parse key-value pairs
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()

                if key == 'Date':
                    metadata['date'] = value
                elif key == 'Begin':
                    metadata['begin_time'] = value
                elif key == 'End':
                    metadata['end_time'] = value
                elif key == 'Time Range':
                    metadata['duration'] = value
                elif key == 'Name':
                    metadata['participant_name'] = value
                elif key == 'Comment':
                    metadata['comment'] = value

        # Find data header
        data_start_idx = None
        for i, line in enumerate(lines):
            if line.strip().startswith('Time_Sec,Ch1,Ch2'):
                data_start_idx = i + 1
                break

        if data_start_idx is None:
            raise ValueError("Could not find data header in CSV file")

        # Parse data points
        for line in lines[data_start_idx:]:
            line = line.strip()
            if not line:
                continue

            parts = line.split(',')
            if len(parts) < 3:
                continue

            try:
                time_sec = float(parts[0])
                ch1 = float(parts[1])  # Primary physiological channel (μV)
                ch2 = float(parts[2])  # Secondary physiological channel (μV)

                # Use Ch1 as primary physiological signal
                # Convert to milliseconds and store value in μV
                timestamp_offset_ms = int(time_sec * 1000)
                value_uv = ch1  # Store in microvolts

                data_points.append({
                    'timestamp_offset_ms': timestamp_offset_ms,
                    'value': value_uv
                })

            except (ValueError, IndexError) as e:
                logging.warning(f"Skipping invalid data line: {line} ({e})")
                continue

        logging.info(f"Parsed {len(data_points)} physiological data points")

        return {
            'metadata': metadata,
            'data': data_points
        }

    def find_or_create_response_record(self, metadata: Dict[str, Any]) -> Optional[str]:
        """
        Find or create a response record in the database for this physiological data.

        Since physiological data is collected continuously during experiments,
        we need to link it to the appropriate experiment session.
        """
        try:
            # Try to find existing response by participant name and date
            participant_name = metadata.get('participant_name', 'unknown')
            date = metadata.get('date', '')

            # First, find or create participant
            participants_collection = self.db.collection('participants')
            participant_result = list(participants_collection.find({'name': participant_name}))

            if not participant_result:
                # Create new participant
                participant_data = {
                    'name': participant_name,
                    'created_at': datetime.now().isoformat()
                }
                participant_result = self.supabase.table('participants').insert(participant_data).execute()
                participant_id = participant_result[0]['_key']
                logging.info(f"Created new participant: {participant_name} (ID: {participant_id})")
            else:
                participant_id = participant_result[0]['_key']
                logging.info(f"Found existing participant: {participant_name} (ID: {participant_id})")

            # Find experiment session for this date/participant
            # For now, create a placeholder experiment session
            from uuid import uuid4
            session_uuid = str(uuid4())

            # Parse begin_time and end_time properly
            begin_time_str = metadata.get('begin_time', '00:00:00')
            end_time_str = metadata.get('end_time')

            # Convert time strings to proper format (assuming HH:MM:SS format)
            try:
                begin_datetime = datetime.strptime(f"{date} {begin_time_str}", "%Y-%m-%d %H:%M:%S")
                end_datetime = datetime.strptime(f"{date} {end_time_str}", "%Y-%m-%d %H:%M:%S") if end_time_str else None
            except ValueError:
                # Fallback to current time if parsing fails
                begin_datetime = datetime.now()
                end_datetime = None

            session_data = {
                'participant_id': participant_id,
                'session_id': session_uuid,  # Use UUID for session_id
                'session_type': 'session-1',  # Use enum value
                'start_time': begin_datetime.isoformat(),
                'end_time': end_datetime.isoformat() if end_datetime else None
            }

            sessions_collection = self.db.collection('participant_experiment_sessions')
            session_data['_key'] = session_uuid
            session_result = sessions_collection.insert(session_data)
            session_id = session_uuid

            # Create a response record for this physiological data
            response_data = {
                'participant_id': participant_id,
                'experiment_id': session_id,  # Using session_id as experiment_id for now
                'word_stimulus_id': 1,  # Placeholder - physiological data spans entire session
                'stimulus_word': 'physiological_baseline',
                'response_word': 'physiological_recording',
                'reaction_time_ms': 0,  # Not applicable for continuous recording
                'session': 'session-1',  # Use enum value
                'timestamp': begin_datetime.isoformat(),
                'audio_file_path': None,
                'video_file_path': None,
                'skin_potential': 0.0,  # Will be calculated from time-series
                'emotion': 'baseline',
                'emotion_confidence': 1.0
            }

            responses_collection = self.db.collection('participant_response_data')
            response_data['_key'] = str(uuid4())
            response_result = responses_collection.insert(response_data)
            response_id = response_data['_key']

            logging.info(f"Created response record for physiological data (ID: {response_id})")

            return response_id

        except Exception as e:
            logging.error(f"Failed to create/find response record: {e}")
            return None

    def import_physiological_data(self, csv_path: str, batch_size: int = 1000) -> bool:
        """
        Import physiological data from CSV file into Supabase.

        Args:
            csv_path: Path to the CSV file
            batch_size: Number of records to insert at once

        Returns:
            True if successful, False otherwise
        """
        try:
            # Parse CSV data
            parsed_data = self.parse_mod002_csv(csv_path)
            metadata = parsed_data['metadata']
            data_points = parsed_data['data']

            if not data_points:
                logging.error("No valid data points found in CSV file")
                return False

            # Find or create response record
            response_id = self.find_or_create_response_record(metadata)
            if not response_id:
                logging.error("Could not create response record")
                return False

            # Insert data in batches
            total_inserted = 0
            for i in range(0, len(data_points), batch_size):
                batch = data_points[i:i + batch_size]

                # Prepare batch data for insertion
                batch_data = [
                    {
                        'response_id': response_id,
                        'timestamp_offset_ms': point['timestamp_offset_ms'],
                        'value': point['value']
                    }
                    for point in batch
                ]

                try:
                    timeseries_collection = self.db.collection('response_skin_potential_timeseries')
                    # Add unique keys for each document
                    for item in batch_data:
                        item['_key'] = f"{response_id}_{item['timestamp_offset_ms']}"
                    result = timeseries_collection.insert_many(batch_data)
                    inserted_count = len(result)
                    total_inserted += inserted_count
                    logging.info(f"Inserted batch {i//batch_size + 1}: {inserted_count} records")

                except Exception as e:
                    logging.error(f"Failed to insert batch {i//batch_size + 1}: {e}")
                    # Continue with next batch rather than failing completely

            logging.info(f"Successfully imported {total_inserted} physiological data points for response {response_id}")

            # Update response record with summary statistics
            if data_points:
                values = [p['value'] for p in data_points]
                avg_value = sum(values) / len(values)
                min_value = min(values)
                max_value = max(values)

                try:
                    responses_collection = self.db.collection('participant_response_data')
                    responses_collection.update_match(
                        {'_key': response_id},
                        {
                            'skin_potential': avg_value,
                            'notes': f"Physiological data: {len(data_points)} points, avg={avg_value:.2f}μV, range=[{min_value:.2f}, {max_value:.2f}]μV"
                        }
                    )

                    logging.info(f"Updated response record with summary statistics")
                except Exception as e:
                    logging.warning(f"Could not update response record summary: {e}")

            return True

        except Exception as e:
            logging.error(f"Failed to import physiological data: {e}")
            return False

    def verify_import(self, response_id: str) -> Dict[str, Any]:
        """
        Verify that the physiological data was imported correctly.
        """
        try:
            # Count total records using AQL
            count_query = """
            RETURN LENGTH(
                FOR doc IN response_skin_potential_timeseries
                    FILTER doc.response_id == @response_id
                    RETURN doc
            )
            """
            count_result = list(self.db.aql.execute(count_query, bind_vars={"response_id": response_id}))
            total_count = count_result[0] if count_result else 0

            # Get sample records
            sample_query = """
            FOR doc IN response_skin_potential_timeseries
                FILTER doc.response_id == @response_id
                LIMIT 5
                RETURN doc
            """
            sample_data = list(self.db.aql.execute(sample_query, bind_vars={"response_id": response_id}))

            # Get statistics using AQL
            stats_query = """
            FOR doc IN response_skin_potential_timeseries
                FILTER doc.response_id == @response_id
                RETURN doc.value
            """
            stats_result = list(self.db.aql.execute(stats_query, bind_vars={"response_id": response_id}))
            if stats_result:
                values = [record['value'] for record in stats_result]
                stats = {
                    'count': len(values),
                    'min': min(values),
                    'max': max(values),
                    'avg': sum(values) / len(values)
                }
            else:
                stats = {'count': 0}

            return {
                'response_id': response_id,
                'total_records': total_count,
                'statistics': stats,
                'sample_records': sample_data
            }

        except Exception as e:
            logging.error(f"Failed to verify import: {e}")
            return {'error': str(e)}

def main():
    """Main import function."""
    if len(sys.argv) < 2:
        print("Usage: python physiological_data_importer.py <csv_file_path>")
        sys.exit(1)

    csv_path = sys.argv[1]

    if not Path(csv_path).exists():
        print(f"Error: CSV file not found: {csv_path}")
        sys.exit(1)

    # Initialize importer
    importer = PhysiologicalDataImporter()

    # Import data
    success = importer.import_physiological_data(csv_path)

    if success:
        print(f"✅ Successfully imported physiological data from {csv_path}")

        # Try to get response ID from recent imports (this is a bit hacky)
        # In a real scenario, we'd return the response_id from the import function
        print("\nTo verify the import, you can check the database directly or run analysis.")

    else:
        print(f"❌ Failed to import physiological data from {csv_path}")
        sys.exit(1)

if __name__ == "__main__":
    main()
