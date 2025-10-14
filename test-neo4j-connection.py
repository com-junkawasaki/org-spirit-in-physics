#!/usr/bin/env python3
"""
Neo4j接続テストスクリプト (Python版)
Merkle DAG: Neo4j統合テスト
"""

import os
import sys
import time
from neo4j import GraphDatabase

def test_neo4j_connection():
    """Neo4j接続をテストする"""

    # 環境変数取得
    neo4j_uri = os.getenv('NEO4J_URI', 'neo4j://localhost:7687')
    neo4j_user = os.getenv('NEO4J_USER', 'neo4j')
    neo4j_password = os.getenv('NEO4J_PASSWORD', 'neo4jpassword')
    neo4j_database = os.getenv('NEO4J_DATABASE', 'neo4j')

    print("Testing Neo4j connection...")
    print(f"URI: {neo4j_uri}")
    print(f"User: {neo4j_user}")
    print(f"Database: {neo4j_database}")
    print()

    driver = None
    session = None

    try:
        # ドライバー作成
        driver = GraphDatabase.driver(
            neo4j_uri,
            auth=(neo4j_user, neo4j_password)
        )

        # 接続テスト
        driver.verify_connectivity()
        print("✅ Neo4j driver connectivity verified")

        # セッション作成
        session = driver.session(database=neo4j_database)

        # 基本クエリテスト
        result = session.run('RETURN 1 as test')
        record = result.single()
        print(f"✅ Basic query test passed: {record['test']}")

        # スキーマ情報取得
        try:
            schema_result = session.run('CALL db.schema.visualization()')
            schema_result.consume()
            print("✅ Schema visualization available")
        except Exception as e:
            print(f"⚠️ Schema visualization not available: {e}")

        # 制約情報取得
        try:
            constraints_result = session.run('SHOW CONSTRAINTS')
            constraints = list(constraints_result)
            print(f"📊 Found {len(constraints)} constraints")
        except Exception as e:
            print(f"⚠️ Could not get constraints: {e}")

        # インデックス情報取得
        try:
            indexes_result = session.run('SHOW INDEXES')
            indexes = list(indexes_result)
            print(f"📊 Found {len(indexes)} indexes")
        except Exception as e:
            print(f"⚠️ Could not get indexes: {e}")

        # 現在のノード数カウント
        try:
            node_count_result = session.run('MATCH (n) RETURN count(n) as nodeCount')
            node_count = node_count_result.single()['nodeCount']
            print(f"📊 Current node count: {node_count}")
        except Exception as e:
            print(f"⚠️ Could not count nodes: {e}")

        # 現在のリレーションシップ数カウント
        try:
            rel_count_result = session.run('MATCH ()-[r]-() RETURN count(r) as relCount')
            rel_count = rel_count_result.single()['relCount']
            print(f"📊 Current relationship count: {rel_count}")
        except Exception as e:
            print(f"⚠️ Could not count relationships: {e}")

        # データベース情報取得
        try:
            db_info_result = session.run('CALL db.info()')
            db_info = db_info_result.single()
            print(f"📊 Database info: {dict(db_info) if db_info else 'N/A'}")
        except Exception as e:
            print(f"⚠️ Could not get database info: {e}")

        print("\n🎉 Neo4j connection test completed successfully!")
        return True

    except Exception as error:
        print(f"❌ Neo4j connection test failed: {error}")
        return False

    finally:
        # リソース解放
        if session:
            session.close()
        if driver:
            driver.close()

def test_environment_variables():
    """環境変数の設定を確認する"""

    print("Checking environment variables...")

    required_vars = [
        'NEO4J_URI',
        'NEO4J_USER',
        'NEO4J_PASSWORD',
        'NEO4J_DATABASE'
    ]

    all_set = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: Not set")
            all_set = False

    if all_set:
        print("✅ All required environment variables are set")
    else:
        print("❌ Some environment variables are missing")

    return all_set

def main():
    """メイン実行関数"""

    print("=== Neo4j Connection Test (Python) ===")
    print()

    # 環境変数チェック
    env_ok = test_environment_variables()
    print()

    if not env_ok:
        print("Environment variables not properly set. Using defaults for testing...")

    # Neo4j接続テスト
    success = test_neo4j_connection()

    print()
    if success:
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()
