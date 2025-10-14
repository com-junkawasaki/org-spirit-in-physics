// Merkle DAG: Neo4jスキーマ初期化スクリプト
// データベース初期化とマイグレーション用

import { createNeo4jClient } from './arangodb';
import { getSchemaInitializationQueries } from './neo4j-schema';

/**
 * Neo4jデータベースのスキーマを初期化する
 */
export async function initializeNeo4jSchema(): Promise<void> {
  const client = createNeo4jClient();

  try {
    console.log('Initializing Neo4j schema...');

    // スキーマ初期化クエリを取得
    const schemaQueries = getSchemaInitializationQueries();

    // 各クエリを順次実行
    for (const query of schemaQueries) {
      console.log(`Executing: ${query}`);
      await client.query(query);
    }

    console.log('Neo4j schema initialization completed successfully');

    // 初期化後の統計を表示
    await logDatabaseStatistics(client);

  } catch (error) {
    console.error('Failed to initialize Neo4j schema:', error);
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * データベース統計をログに出力する
 */
async function logDatabaseStatistics(client: any): Promise<void> {
  try {
    console.log('\n=== Database Statistics ===');

    // ノード数のカウント
    const nodeCountQuery = `
      MATCH (n)
      RETURN labels(n) as labels, count(*) as count
      ORDER BY count DESC
    `;
    const nodeStats = await client.query(nodeCountQuery);
    console.log('Node counts:');
    nodeStats.forEach((stat: any) => {
      console.log(`  ${stat.labels.join(':')}: ${stat.count}`);
    });

    // リレーションシップ数のカウント
    const relCountQuery = `
      MATCH ()-[r]-()
      RETURN type(r) as type, count(*) as count
      ORDER BY count DESC
    `;
    const relStats = await client.query(relCountQuery);
    console.log('Relationship counts:');
    relStats.forEach((stat: any) => {
      console.log(`  ${stat.type}: ${stat.count}`);
    });

    // 制約の確認
    const constraintQuery = `SHOW CONSTRAINTS`;
    const constraints = await client.query(constraintQuery);
    console.log(`Constraints: ${constraints.length}`);

    // インデックスの確認
    const indexQuery = `SHOW INDEXES`;
    const indexes = await client.query(indexQuery);
    console.log(`Indexes: ${indexes.length}`);

  } catch (error) {
    console.error('Failed to log database statistics:', error);
  }
}

/**
 * ArangoDBからNeo4jへのデータマイグレーションを実行する
 */
export async function migrateFromArangoDB(arangoClient: any): Promise<void> {
  const neo4jClient = createNeo4jClient();

  try {
    console.log('Starting data migration from ArangoDB to Neo4j...');

    // 参加者データのマイグレーション
    await migrateParticipants(arangoClient, neo4jClient);

    // セッションデータのマイグレーション
    await migrateSessions(arangoClient, neo4jClient);

    // レスポンスデータのマイグレーション
    await migrateResponses(arangoClient, neo4jClient);

    console.log('Data migration completed successfully');

  } catch (error) {
    console.error('Data migration failed:', error);
    throw error;
  } finally {
    await neo4jClient.close();
  }
}

/**
 * 参加者データをマイグレーションする
 */
async function migrateParticipants(arangoClient: any, neo4jClient: any): Promise<void> {
  console.log('Migrating participants...');

  const participantsQuery = `FOR p IN participants RETURN p`;
  const participants = await arangoClient.query(participantsQuery);

  let migratedCount = 0;
  for (const participant of participants) {
    const createQuery = `
      CREATE (p:Participant {
        id: $id,
        name: $name,
        age: $age,
        gender: $gender,
        handedness: $handedness,
        signature: $signature,
        agreedAt: $agreedAt,
        agreements: $agreements,
        hasSessionData: $hasSessionData,
        hasVideoFiles: $hasVideoFiles,
        videoFiles: $videoFiles,
        created_at: $created_at
      })
      RETURN p
    `;

    const params = {
      id: participant._key,
      name: participant.name,
      age: participant.age,
      gender: participant.gender,
      handedness: participant.handedness,
      signature: participant.signature,
      agreedAt: participant.agreedAt,
      agreements: participant.agreements,
      hasSessionData: participant.hasSessionData,
      hasVideoFiles: participant.hasVideoFiles,
      videoFiles: participant.videoFiles,
      created_at: participant.created_at
    };

    await neo4jClient.query(createQuery, params);
    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} participants`);
}

/**
 * セッションデータをマイグレーションする
 */
async function migrateSessions(arangoClient: any, neo4jClient: any): Promise<void> {
  console.log('Migrating sessions...');

  const sessionsQuery = `FOR s IN participant_sessions RETURN s`;
  const sessions = await arangoClient.query(sessionsQuery);

  let migratedCount = 0;
  for (const session of sessions) {
    const createQuery = `
      MATCH (p:Participant {id: $participantId})
      CREATE (p)-[:HAS_SESSION]->(s:Session {
        id: $id,
        participant_id: $participantId,
        session_index: $sessionIndex,
        start_ts: $startTs,
        end_ts: $endTs,
        events: $events
      })
      RETURN s
    `;

    const params = {
      id: session._key,
      participantId: session.participant_id,
      sessionIndex: session.session_index,
      startTs: session.start_ts,
      endTs: session.end_ts,
      events: session.events
    };

    await neo4jClient.query(createQuery, params);
    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} sessions`);
}

/**
 * レスポンスデータをマイグレーションする
 */
async function migrateResponses(arangoClient: any, neo4jClient: any): Promise<void> {
  console.log('Migrating responses...');

  const responsesQuery = `FOR r IN participant_session_responses RETURN r`;
  const responses = await arangoClient.query(responsesQuery);

  let migratedCount = 0;
  for (const response of responses) {
    const createQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      CREATE (s)-[:HAS_RESPONSE]->(r:Response {
        stimulus_word: $stimulusWord,
        response_word: $responseWord,
        reaction_time_ms: $reactionTimeMs,
        event_ts: $eventTs,
        emotion: $emotion,
        emotion_confidence: $emotionConfidence,
        participant_id: $participantId,
        session_id: $sessionId
      })
      RETURN r
    `;

    const params = {
      participantId: response.participant_id,
      sessionId: response.session_id,
      stimulusWord: response.stimulus_word,
      responseWord: response.response_word,
      reactionTimeMs: response.reaction_time_ms,
      eventTs: response.event_ts,
      emotion: response.emotion,
      emotionConfidence: response.emotion_confidence
    };

    await neo4jClient.query(createQuery, params);
    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} responses`);
}

// Merkle DAG: スキーマ初期化スクリプト完了
// これによりArangoDBからNeo4jへの完全移行が可能
