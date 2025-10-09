#!/usr/bin/env python3
"""
Script to generate SQL for importing response data from analysis_results.json.
"""

import json
import uuid
from datetime import datetime

def generate_sql():
    """Generate SQL INSERT statements for response data."""

    # Load analysis results
    with open("results/analysis_results.json", "r", encoding="utf-8") as f:
        analysis_data = json.load(f)

    sql_statements = []
    total_responses = 0

    # First, ensure word stimuli exist
    word_stimuli = set()
    for participant_data in analysis_data.values():
        for result in participant_data["results"]:
            word_stimuli.add(result["stimulus_word"])

    # Generate word stimuli INSERT statements
    for word in word_stimuli:
        word_id = hash(word) % 1000000
        sql = f"""INSERT INTO word_stimuli (id, word, created_at)
VALUES ({word_id}, '{word.replace("'", "''")}', '{datetime.now().isoformat()}')
ON CONFLICT (id) DO NOTHING;"""
        sql_statements.append(sql)

    # Generate response data INSERT statements
    for participant_id, participant_data in analysis_data.items():
        for result in participant_data["results"]:
            response_id = str(uuid.uuid4())
            stimulus_word = result["stimulus_word"]
            word_id = hash(stimulus_word) % 1000000

            # Get experiment session ID (we'll need to join with participant_experiment_sessions)
            # For now, we'll assume session-1 and update later if needed
            sql = f"""INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    '{response_id}',
    '{participant_id}',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = '{participant_id}' AND session_type = 'session-1'
     LIMIT 1),
    {word_id},
    '{stimulus_word.replace("'", "''")}',
    '{result["response_word"].replace("'", "''")}',
    {result["reaction_time_ms"]},
    'session-1',
    '{datetime.now().isoformat()}',
    {result["components"].get("skin_potential", "NULL")},
    '{datetime.now().isoformat()}',
    '{datetime.now().isoformat()}'
) ON CONFLICT DO NOTHING;"""

            sql_statements.append(sql)
            total_responses += 1

    # Write SQL to file
    with open("import_response_data.sql", "w", encoding="utf-8") as f:
        f.write("-- Generated SQL for importing response data\n")
        f.write("-- Execute this file against your Supabase database\n\n")
        f.write("\\c postgres\n\n")

        for sql in sql_statements:
            f.write(sql + "\n\n")

        f.write(f"-- Total responses to import: {total_responses}\n")

    print(f"Generated SQL file with {len(sql_statements)} statements for {total_responses} responses")

if __name__ == "__main__":
    generate_sql()
