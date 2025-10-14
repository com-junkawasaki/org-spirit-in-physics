// Neo4j接続テストスクリプト
// Merkle DAG: Neo4j統合テスト

import neo4j from 'neo4j-driver';

// Neo4j接続設定
const NEO4J_URI = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4jpassword';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

async function testNeo4jConnection() {
  console.log('Testing Neo4j connection...');
  console.log(`URI: ${NEO4J_URI}`);
  console.log(`User: ${NEO4J_USER}`);
  console.log(`Database: ${NEO4J_DATABASE}`);

  let driver;
  let session;

  try {
    // ドライバー作成
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );

    // 接続テスト
    await driver.verifyConnectivity();
    console.log('✅ Neo4j driver connectivity verified');

    // セッション作成
    session = driver.session({ database: NEO4J_DATABASE });

    // 基本クエリテスト
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Basic query test passed:', result.records[0].get('test'));

    // スキーマ情報取得
    const schemaResult = await session.run('CALL db.schema.visualization()');
    console.log('✅ Schema visualization available');

    // 制約情報取得
    const constraintsResult = await session.run('SHOW CONSTRAINTS');
    console.log(`📊 Found ${constraintsResult.records.length} constraints`);

    // インデックス情報取得
    const indexesResult = await session.run('SHOW INDEXES');
    console.log(`📊 Found ${indexesResult.records.length} indexes`);

    // 現在のノード数カウント
    const nodeCountResult = await session.run('MATCH (n) RETURN count(n) as nodeCount');
    console.log(`📊 Current node count: ${nodeCountResult.records[0].get('nodeCount')}`);

    // 現在のリレーションシップ数カウント
    const relCountResult = await session.run('MATCH ()-[r]-() RETURN count(r) as relCount');
    console.log(`📊 Current relationship count: ${relCountResult.records[0].get('relCount')}`);

    console.log('\n🎉 Neo4j connection test completed successfully!');

  } catch (error) {
    console.error('❌ Neo4j connection test failed:', error.message);
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
testNeo4jConnection().catch(console.error);
