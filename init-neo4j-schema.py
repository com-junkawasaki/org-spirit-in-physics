#!/usr/bin/env python3
"""
Neo4jスキーマ初期化スクリプト
Merkle DAG: スキーマ初期化
"""

import os
import sys
from neo4j import GraphDatabase

def init_neo4j_schema():
    """Neo4jスキーマを初期化する"""

    # 環境変数取得
    neo4j_uri = os.getenv('NEO4J_URI', 'neo4j://localhost:7687')
    neo4j_user = os.getenv('NEO4J_USER', 'neo4j')
    neo4j_password = os.getenv('NEO4J_PASSWORD', 'neo4jpassword')
    neo4j_database = os.getenv('NEO4J_DATABASE', 'neo4j')

    print("Initializing Neo4j schema...")
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

        # セッション作成
        session = driver.session(database=neo4j_database)

        print("Creating constraints...")

        # ユニーク制約作成
        constraints = [
            "CREATE CONSTRAINT participant_id_unique IF NOT EXISTS FOR (p:Participant) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT session_id_unique IF NOT EXISTS FOR (s:ExperimentSession) REQUIRE s.id IS UNIQUE",
            "CREATE CONSTRAINT response_id_unique IF NOT EXISTS FOR (r:Response) REQUIRE r.id IS UNIQUE",
            "CREATE CONSTRAINT word_stimulus_id_unique IF NOT EXISTS FOR (w:WordStimulus) REQUIRE w.id IS UNIQUE",
            "CREATE CONSTRAINT analysis_run_id_unique IF NOT EXISTS FOR (ar:AnalysisRun) REQUIRE ar.id IS UNIQUE",
            "CREATE CONSTRAINT import_job_id_unique IF NOT EXISTS FOR (ij:ImportJob) REQUIRE ij.id IS UNIQUE"
        ]

        for constraint in constraints:
            try:
                session.run(constraint)
                print(f"✅ Created constraint: {constraint.split('FOR')[1].strip()}")
            except Exception as e:
                print(f"⚠️ Failed to create constraint: {e}")

        print("\nCreating indexes...")

        # インデックス作成
        indexes = [
            "CREATE INDEX participant_age_idx IF NOT EXISTS FOR (p:Participant) ON (p.age)",
            "CREATE INDEX participant_gender_idx IF NOT EXISTS FOR (p:Participant) ON (p.gender)",
            "CREATE INDEX session_participant_idx IF NOT EXISTS FOR (s:ExperimentSession) ON (s.participant_id)",
            "CREATE INDEX response_session_idx IF NOT EXISTS FOR (r:Response) ON (r.experiment_id)",
            "CREATE INDEX response_participant_idx IF NOT EXISTS FOR (r:Response) ON (r.participant_id)",
            "CREATE INDEX response_emotion_idx IF NOT EXISTS FOR (r:Response) ON (r.emotion)",
            "CREATE INDEX response_created_at_idx IF NOT EXISTS FOR (r:Response) ON (r.created_at)",
            "CREATE INDEX session_created_at_idx IF NOT EXISTS FOR (s:ExperimentSession) ON (s.created_at)",
            "CREATE INDEX analysis_run_created_at_idx IF NOT EXISTS FOR (ar:AnalysisRun) ON (ar.created_at)"
        ]

        for index in indexes:
            try:
                session.run(index)
                print(f"✅ Created index: {index.split('FOR')[1].strip()}")
            except Exception as e:
                print(f"⚠️ Failed to create index: {e}")

        print("\nVerifying schema...")

        # 制約確認
        constraint_result = session.run("SHOW CONSTRAINTS")
        constraint_count = len(list(constraint_result))
        print(f"📊 Total constraints: {constraint_count}")

        # インデックス確認
        index_result = session.run("SHOW INDEXES")
        index_count = len(list(index_result))
        print(f"📊 Total indexes: {index_count}")

        print("\n🎉 Neo4j schema initialization completed successfully!")

    except Exception as error:
        print(f"❌ Neo4j schema initialization failed: {error}")
        return False

    finally:
        # リソース解放
        if session:
            session.close()
        if driver:
            driver.close()

    return True

def main():
    """メイン実行関数"""
    print("=== Neo4j Schema Initialization ===")
    print()

    success = init_neo4j_schema()

    print()
    if success:
        print("🎉 Schema initialization completed!")
        sys.exit(0)
    else:
        print("❌ Schema initialization failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()
