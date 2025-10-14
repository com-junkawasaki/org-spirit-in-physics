// Neo4jテストデータ挿入スクリプト
// Merkle DAG: データ挿入テスト

import neo4j from 'neo4j-driver';

// Neo4j接続設定
const NEO4J_URI = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4jpassword';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

async function insertTestData() {
  console.log('Inserting test data into Neo4j...');

  let driver;
  let session;

  try {
    // ドライバー作成
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );

    // セッション作成
    session = driver.session({ database: NEO4J_DATABASE });

    // テスト参加者作成
    console.log('Creating test participant...');
    await session.run(`
      CREATE (p:Participant {
        id: 'test-participant-001',
        name: 'テスト参加者',
        age: 30,
        gender: 'other',
        handedness: 'right',
        signature: 'テスト署名',
        agreedAt: datetime('2025-10-14T00:00:00Z'),
        agreements: 'consent=true,terms=true',
        hasSessionData: true,
        hasVideoFiles: false,
        created_at: datetime('2025-10-14T00:00:00Z')
      })
      RETURN p
    `);

    // テストセッション作成
    console.log('Creating test session...');
    await session.run(`
      MATCH (p:Participant {id: 'test-participant-001'})
      CREATE (p)-[:HAS_SESSION]->(s:Session {
        id: 'test-participant-001-0',
        participant_id: 'test-participant-001',
        session_index: 0,
        start_ts: 1728864000000,
        end_ts: 1728867600000,
        events: '[{"type":"session_started","timestamp":"2025-10-14T00:00:00Z"},{"type":"word_displayed","word":"愛","timestamp":"2025-10-14T00:01:00Z"},{"type":"response_submitted","response":"愛情","timestamp":"2025-10-14T00:01:02Z"},{"type":"session_ended","timestamp":"2025-10-14T00:10:00Z"}]'
      })
      RETURN s
    `);

    // テストレスポンス作成
    console.log('Creating test responses...');
    await session.run(`
      MATCH (p:Participant {id: 'test-participant-001'})-[:HAS_SESSION]->(s:Session {id: 'test-participant-001-0'})
      CREATE (s)-[:HAS_RESPONSE]->(r:Response {
        stimulus_word: '愛',
        response_word: '愛情',
        reaction_time_ms: 2000,
        event_ts: 1728864060000,
        emotion: 'joy',
        emotion_confidence: 0.85,
        participant_id: 'test-participant-001',
        session_id: 'test-participant-001-0'
      })
      RETURN r
    `);

    // データ検証
    console.log('\nVerifying inserted data...');

    // 参加者数確認
    const participantCount = await session.run('MATCH (p:Participant) RETURN count(p) as count');
    console.log(`📊 Total participants: ${participantCount.records[0].get('count')}`);

    // セッション数確認
    const sessionCount = await session.run('MATCH (s:Session) RETURN count(s) as count');
    console.log(`📊 Total sessions: ${sessionCount.records[0].get('count')}`);

    // レスポンス数確認
    const responseCount = await session.run('MATCH (r:Response) RETURN count(r) as count');
    console.log(`📊 Total responses: ${responseCount.records[0].get('count')}`);

    // 関係性数確認
    const relCount = await session.run('MATCH ()-[r]-() RETURN count(r) as count');
    console.log(`📊 Total relationships: ${relCount.records[0].get('count')}`);

    // サンプルクエリ実行
    console.log('\nTesting sample queries...');

    // 参加者とセッションの関係性確認
    const participantWithSessions = await session.run(`
      MATCH (p:Participant)-[:HAS_SESSION]->(s:Session)
      RETURN p.id as participantId, s.id as sessionId, s.session_index as sessionIndex
    `);
    console.log('✅ Participant-Session relationships:', participantWithSessions.records.length);

    // セッションとレスポンスの関係性確認
    const sessionWithResponses = await session.run(`
      MATCH (s:Session)-[:HAS_RESPONSE]->(r:Response)
      RETURN s.id as sessionId, r.stimulus_word as stimulus, r.response_word as response
    `);
    console.log('✅ Session-Response relationships:', sessionWithResponses.records.length);

    // 感情分析クエリ
    const emotionQuery = await session.run(`
      MATCH (r:Response)
      WHERE r.emotion IS NOT NULL
      RETURN r.emotion as emotion, r.emotion_confidence as confidence
    `);
    console.log('✅ Emotion analysis query:', emotionQuery.records.length, 'results');

    console.log('\n🎉 Test data insertion and queries completed successfully!');

  } catch (error) {
    console.error('❌ Test data insertion failed:', error.message);
    process.exit(1);
  } finally {
    // リソース解放
    if (session) {
      await session.close();
    }
    if (driver) {
      await driver.close();
    }
  }
}

// 実行
insertTestData().catch(console.error);
