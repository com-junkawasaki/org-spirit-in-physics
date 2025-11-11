#!/bin/bash
# Import timeline points from session_data.json using PostgreSQL

set -e

PARTICIPANT_ID="2a0d7a69-f953-4c29-87a5-8a8e4e8bd413"
SESSION_DATA_PATH="apps/visualizer/public/dataset/participants/${PARTICIPANT_ID}/session_data.json"

if [ ! -f "$SESSION_DATA_PATH" ]; then
    echo "Error: Session data file not found: $SESSION_DATA_PATH"
    exit 1
fi

echo "Reading session data from $SESSION_DATA_PATH..."

# Use Node.js to process JSON and generate SQL
docker exec spirit-visualizer sh -c "cd /app && node" <<NODE_SCRIPT
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/dataset/participants/${PARTICIPANT_ID}/session_data.json', 'utf8'));
const events = data.events || [];
const startTs = events[0]?.timestamp;
const endEvent = [...events].reverse().find(e => e.type === 'response_window_closed');
const endTs = endEvent?.timestamp || events[events.length - 1]?.timestamp;

// Create session first
const sessionSql = \`
INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '${PARTICIPANT_ID}'::UUID,
    0,
    \${startTs},
    \${endTs},
    '\${JSON.stringify(events).replace(/'/g, "''")}'::JSONB,
    NOW(),
    NOW()
)
ON CONFLICT (participant_id, session_index) DO UPDATE SET
    events = EXCLUDED.events,
    start_ts = EXCLUDED.start_ts,
    end_ts = EXCLUDED.end_ts,
    updated_at = NOW()
RETURNING id;
\`;

console.log('-- Session SQL');
console.log(sessionSql);

// Generate timeline points
const wordEvents = events.filter(e => e.type === 'word_displayed');
console.log('-- Timeline points SQL');
console.log('DELETE FROM timeline_points WHERE participant_id = \\'${PARTICIPANT_ID}\\'::UUID;');
console.log('');

wordEvents.forEach((event, idx) => {
    const timestamp = event.timestamp;
    const word = (event.payload?.word || 'Unknown').replace(/'/g, "''");
    
    // Find reaction time
    const reactionEvent = events.find(e => 
        e.timestamp > timestamp && 
        (e.type === 'speech_detected' || e.type === 'response_window_closed')
    );
    const reactionTime = reactionEvent ? (reactionEvent.timestamp - timestamp) / 1000.0 : null;
    
    const time = new Date(timestamp).toISOString();
    const hasResponse = reactionTime !== null;
    
    console.log(\`INSERT INTO timeline_points (
    time, participant_id, session_id, word, event_type,
    reaction_value, reaction_time, has_response,
    emotions, physiological, metadata, created_at
) VALUES (
    '\${time}',
    '${PARTICIPANT_ID}'::UUID,
    (SELECT id FROM sessions WHERE participant_id = '${PARTICIPANT_ID}'::UUID AND session_index = 0 LIMIT 1),
    '\${word}',
    'word_displayed',
    0.0,
    \${reactionTime !== null ? reactionTime : 'NULL'},
    \${hasResponse},
    '[]'::JSONB,
    '{"average": 0, "max": 0, "min": 0, "channels": {}}'::JSONB,
    '{"emotionCount": 0, "physiologicalCount": 0}'::JSONB,
    NOW()
);\`);
});

console.log('');
console.log('-- Verify');
console.log('SELECT COUNT(*) as timeline_points_count FROM timeline_points WHERE participant_id = \\'${PARTICIPANT_ID}\\'::UUID;');
NODE_SCRIPT

