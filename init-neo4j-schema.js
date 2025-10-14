// Neo4jスキーマ初期化スクリプト
// Merkle DAG: スキーマ初期化実行

import neo4j from 'neo4j-driver';

// Neo4j接続設定
const NEO4J_URI = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4jpassword';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

// スキーマ定義 (Community Edition対応)
const SCHEMA_CONSTRAINTS = [
  `CREATE CONSTRAINT participant_id_unique IF NOT EXISTS FOR (p:Participant) REQUIRE p.id IS UNIQUE`,
  `CREATE CONSTRAINT session_id_unique IF NOT EXISTS FOR (s:Session) REQUIRE s.id IS UNIQUE`,
  `CREATE CONSTRAINT response_id_unique IF NOT EXISTS FOR (r:Response) REQUIRE r.id IS UNIQUE`,
  `CREATE CONSTRAINT word_stimulus_id_unique IF NOT EXISTS FOR (w:WordStimulus) REQUIRE w.id IS UNIQUE`,
  // Node Key制約はEnterprise Editionのみなので、ユニーク制約のみを使用
];

const SCHEMA_INDEXES = [
  `CREATE INDEX participant_created_at_idx IF NOT EXISTS FOR (p:Participant) ON (p.created_at)`,
  `CREATE INDEX session_start_ts_idx IF NOT EXISTS FOR (s:Session) ON (s.start_ts)`,
  `CREATE INDEX response_event_ts_idx IF NOT EXISTS FOR (r:Response) ON (r.event_ts)`,
  `CREATE INDEX response_emotion_idx IF NOT EXISTS FOR (r:Response) ON (r.emotion)`,
];

async function initializeSchema() {
  console.log('Initializing Neo4j schema...');

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

    // 制約作成
    console.log('Creating constraints...');
    for (const constraint of SCHEMA_CONSTRAINTS) {
      console.log(`Executing: ${constraint}`);
      await session.run(constraint);
    }

    // インデックス作成
    console.log('Creating indexes...');
    for (const index of SCHEMA_INDEXES) {
      console.log(`Executing: ${index}`);
      await session.run(index);
    }

    // 作成された制約とインデックスを確認
    console.log('\nVerifying schema...');
    const constraintsResult = await session.run('SHOW CONSTRAINTS');
    console.log(`📊 Created ${constraintsResult.records.length} constraints`);

    const indexesResult = await session.run('SHOW INDEXES');
    console.log(`📊 Created ${indexesResult.records.length} indexes`);

    console.log('\n🎉 Neo4j schema initialization completed successfully!');

  } catch (error) {
    console.error('❌ Schema initialization failed:', error.message);
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
initializeSchema().catch(console.error);
