const fs = require('fs');
const { Client } = require('pg');

const participantId = '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413';
const sessionDataPath = '/app/public/dataset/participants/2a0d7a69-f953-4c29-87a5-8a8e4e8bd413/session_data.json';

const sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
const events = sessionData.events || [];
const startTs = events[0]?.timestamp;
const endEvent = [...events].reverse().find(e => e.type === 'response_window_closed');
const endTs = endEvent?.timestamp || events[events.length - 1]?.timestamp;

const wordEvents = events.filter(e => e.type === 'word_displayed');
console.log(`Total events: ${events.length}`);
console.log(`Word displayed events: ${wordEvents.length}`);

const client = new Client({
  host: 'postgres',
  port: 5432,
  database: 'spirit_in_physics',
  user: 'postgres',
  password: 'postgres'
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Create participant
    await client.query(
      'INSERT INTO participants (id, created_at, updated_at) VALUES ($1, NOW(), NOW()) ON CONFLICT (id) DO NOTHING',
      [participantId]
    );
    console.log('Participant created/verified');
    
    // Create session with full events
    const result = await client.query(`
      INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (participant_id, session_index) DO UPDATE SET events = EXCLUDED.events, start_ts = EXCLUDED.start_ts, end_ts = EXCLUDED.end_ts
      RETURNING id
    `, [participantId, 0, startTs, endTs, JSON.stringify(events)]);
    
    const sessionId = result.rows[0].id;
    console.log('Session created/updated:', sessionId);
    console.log('Events:', events.length);
    console.log('Start time:', startTs);
    console.log('End time:', endTs);
    
    // Generate timeline points
    console.log('Generating timeline points...');
    let timelineCount = 0;
    
    for (const event of events) {
      if (event.type === 'word_displayed') {
        const timestamp = event.timestamp;
        const word = event.payload?.word || 'Unknown';
        
        // Find reaction time
        const reactionEvent = events.find(e => 
          e.timestamp > timestamp && 
          (e.type === 'speech_detected' || e.type === 'response_window_closed')
        );
        const reactionTime = reactionEvent ? (reactionEvent.timestamp - timestamp) / 1000.0 : null;
        
        const time = new Date(timestamp).toISOString();
        
        await client.query(`
          INSERT INTO timeline_points (
            time, participant_id, session_id, word, event_type,
            reaction_value, reaction_time, has_response,
            emotions, physiological, metadata, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `, [
          time,
          participantId,
          sessionId,
          word,
          'word_displayed',
          0.0,
          reactionTime,
          reactionTime !== null,
          JSON.stringify([]),
          JSON.stringify({ average: 0, max: 0, min: 0, channels: {} }),
          JSON.stringify({ emotionCount: 0, physiologicalCount: 0 })
        ]);
        
        timelineCount++;
      }
    }
    
    console.log(`Created ${timelineCount} timeline points`);
    
    await client.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

