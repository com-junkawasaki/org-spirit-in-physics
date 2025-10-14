#!/usr/bin/env python3
"""
Neo4jテストデータ挿入スクリプト (Python版)
Merkle DAG: データ挿入テスト
"""

import os
import sys
import json
from datetime import datetime
from neo4j import GraphDatabase

def insert_test_data():
    """Neo4jにテストデータを挿入する"""

    # 環境変数取得
    neo4j_uri = os.getenv('NEO4J_URI', 'neo4j://localhost:7687')
    neo4j_user = os.getenv('NEO4J_USER', 'neo4j')
    neo4j_password = os.getenv('NEO4J_PASSWORD', 'neo4jpassword')
    neo4j_database = os.getenv('NEO4J_DATABASE', 'neo4j')

    print("Inserting test data into Neo4j...")
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

        print("Creating test participant...")

        # テスト参加者作成
        participant_query = """
        MERGE (p:Participant {id: $id})
        SET p += $properties
        RETURN p
        """

        participant_props = {
            "name": "テスト参加者",
            "age": 30,
            "gender": "other",
            "handedness": "right",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        session.run(participant_query, id="test-participant-001", properties=participant_props)
        print("✅ Created test participant")

        print("Creating test session...")

        # テストセッション作成
        session_query = """
        MATCH (p:Participant {id: $participant_id})
        MERGE (s:ExperimentSession {id: $session_id})
        SET s += $properties
        MERGE (p)-[:HAS_SESSION]->(s)
        RETURN s
        """

        session_props = {
            "participant_id": "test-participant-001",
            "session_type": "word_association",
            "start_time": "2025-10-14T00:00:00Z",
            "end_time": "2025-10-14T00:10:00Z",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        session.run(session_query,
                   participant_id="test-participant-001",
                   session_id="test-participant-001-0",
                   properties=session_props)
        print("✅ Created test session")

        print("Creating test word stimuli...")

        # テスト刺激語作成
        stimuli = [
            {"id": "word-001", "word": "愛", "category": "emotion"},
            {"id": "word-002", "word": "死", "category": "philosophy"},
            {"id": "word-003", "word": "希望", "category": "emotion"}
        ]

        stimulus_query = """
        MERGE (w:WordStimulus {id: $id})
        SET w += $properties
        RETURN w
        """

        for stimulus in stimuli:
            stimulus_props = {
                "word": stimulus["word"],
                "category": stimulus["category"],
                "created_at": datetime.now().isoformat()
            }
            session.run(stimulus_query, id=stimulus["id"], properties=stimulus_props)

        print(f"✅ Created {len(stimuli)} test stimuli")

        print("Creating test responses...")

        # テストレスポンス作成
        responses = [
            {
                "id": "response-001",
                "participant_id": "test-participant-001",
                "experiment_id": "test-participant-001-0",
                "word_stimulus_id": "word-001",
                "stimulus_word": "愛",
                "response_word": "愛情",
                "reaction_time_ms": 2000,
                "emotion": "joy",
                "emotion_confidence": 0.85
            },
            {
                "id": "response-002",
                "participant_id": "test-participant-001",
                "experiment_id": "test-participant-001-0",
                "word_stimulus_id": "word-002",
                "stimulus_word": "死",
                "response_word": "永遠",
                "reaction_time_ms": 1800,
                "emotion": "fear",
                "emotion_confidence": 0.72
            },
            {
                "id": "response-003",
                "participant_id": "test-participant-001",
                "experiment_id": "test-participant-001-0",
                "word_stimulus_id": "word-003",
                "stimulus_word": "希望",
                "response_word": "未来",
                "reaction_time_ms": 1500,
                "emotion": "optimism",
                "emotion_confidence": 0.91
            }
        ]

        response_query = """
        MATCH (p:Participant {id: $participant_id})
        MATCH (s:ExperimentSession {id: $experiment_id})
        OPTIONAL MATCH (w:WordStimulus {id: $word_stimulus_id})
        MERGE (r:Response {id: $response_id})
        SET r += $properties
        MERGE (s)-[:HAS_RESPONSE]->(r)
        MERGE (p)-[:HAS_RESPONSE]->(r)
        FOREACH (_ IN CASE WHEN w IS NOT NULL THEN [1] ELSE [] END |
          MERGE (r)-[:USES_STIMULUS]->(w)
        )
        RETURN r
        """

        for response in responses:
            response_props = {
                "participant_id": response["participant_id"],
                "experiment_id": response["experiment_id"],
                "word_stimulus_id": response["word_stimulus_id"],
                "stimulus_word": response["stimulus_word"],
                "response_word": response["response_word"],
                "reaction_time_ms": response["reaction_time_ms"],
                "emotion": response["emotion"],
                "emotion_confidence": response["emotion_confidence"],
                "timestamp": datetime.now().isoformat(),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }

            session.run(response_query,
                       participant_id=response["participant_id"],
                       experiment_id=response["experiment_id"],
                       word_stimulus_id=response["word_stimulus_id"],
                       response_id=response["id"],
                       properties=response_props)

        print(f"✅ Created {len(responses)} test responses")

        print("Creating test Hume AI predictions...")

        # Hume AI予測データの作成
        hume_predictions = [
            {
                "id": "hume-001",
                "response_id": "response-001",
                "prediction_type": "burst",
                "begin_time": 0.0,
                "end_time": 2.0,
                "emotions": {"joy": 0.85, "surprise": 0.15},
                "confidence": 0.9
            },
            {
                "id": "hume-002",
                "response_id": "response-002",
                "prediction_type": "prosody",
                "begin_time": 0.0,
                "end_time": 1.8,
                "emotions": {"fear": 0.72, "tension": 0.28},
                "confidence": 0.8
            },
            {
                "id": "hume-003",
                "response_id": "response-003",
                "prediction_type": "language",
                "begin_time": 0.0,
                "end_time": 1.5,
                "emotions": {"optimism": 0.91, "confidence": 0.09},
                "text": "未来",
                "confidence": 0.95
            }
        ]

        hume_query = """
        MATCH (r:Response {id: $response_id})
        MERGE (hp:HumePrediction {id: $prediction_id})
        SET hp += $properties
        MERGE (r)-[:HAS_HUME_PREDICTION]->(hp)
        RETURN hp
        """

        for prediction in hume_predictions:
            prediction_props = {
                "response_id": prediction["response_id"],
                "prediction_type": prediction["prediction_type"],
                "begin_time": prediction["begin_time"],
                "end_time": prediction["end_time"],
                "emotions": json.dumps(prediction["emotions"]),
                "confidence": prediction["confidence"],
                "created_at": datetime.now().isoformat()
            }

            if "text" in prediction:
                prediction_props["text"] = prediction["text"]

            session.run(hume_query,
                       response_id=prediction["response_id"],
                       prediction_id=prediction["id"],
                       properties=prediction_props)

        print(f"✅ Created {len(hume_predictions)} test Hume AI predictions")

        print("\nVerifying inserted data...")

        # データ検証
        verification_queries = [
            ("Total participants", "MATCH (p:Participant) RETURN count(p) as count"),
            ("Total sessions", "MATCH (s:ExperimentSession) RETURN count(s) as count"),
            ("Total responses", "MATCH (r:Response) RETURN count(r) as count"),
            ("Total stimuli", "MATCH (w:WordStimulus) RETURN count(w) as count"),
            ("Total Hume predictions", "MATCH (hp:HumePrediction) RETURN count(hp) as count"),
            ("Total relationships", "MATCH ()-[r]-() RETURN count(r) as count")
        ]

        for label, query in verification_queries:
            result = session.run(query)
            count = result.single()["count"]
            print(f"📊 {label}: {count}")

        print("\nTesting sample queries...")

        # サンプルクエリテスト
        sample_queries = [
            ("Participant-Session relationships",
             "MATCH (p:Participant)-[:HAS_SESSION]->(s:ExperimentSession) RETURN count(*) as count"),
            ("Session-Response relationships",
             "MATCH (s:ExperimentSession)-[:HAS_RESPONSE]->(r:Response) RETURN count(*) as count"),
            ("Response-Stimulus relationships",
             "MATCH (r:Response)-[:USES_STIMULUS]->(w:WordStimulus) RETURN count(*) as count"),
            ("Response-Hume relationships",
             "MATCH (r:Response)-[:HAS_HUME_PREDICTION]->(hp:HumePrediction) RETURN count(*) as count"),
            ("Emotion analysis results",
             "MATCH (r:Response) WHERE r.emotion IS NOT NULL RETURN count(*) as count")
        ]

        for label, query in sample_queries:
            result = session.run(query)
            count = result.single()["count"]
            print(f"✅ {label}: {count}")

        # 複雑なクエリテスト
        print("\nTesting complex queries...")

        # 参加者ごとの感情分布
        emotion_dist_query = """
        MATCH (p:Participant)-[:HAS_RESPONSE]->(r:Response)
        WHERE r.emotion IS NOT NULL
        RETURN p.id as participant, r.emotion as emotion, count(*) as count
        ORDER BY participant, emotion
        """

        emotion_results = list(session.run(emotion_dist_query))
        print(f"✅ Emotion distribution by participant: {len(emotion_results)} records")

        # 平均反応時間
        avg_reaction_query = """
        MATCH (r:Response)
        WHERE r.reaction_time_ms IS NOT NULL
        RETURN avg(r.reaction_time_ms) as avg_reaction_time
        """

        avg_result = session.run(avg_reaction_query).single()
        avg_time = avg_result["avg_reaction_time"]
        print(f"✅ Average reaction time: {avg_time:.1f}ms")

        # Hume AI予測の感情スコア平均
        hume_emotion_query = """
        MATCH (hp:HumePrediction)
        WHERE hp.confidence IS NOT NULL
        RETURN avg(hp.confidence) as avg_confidence
        """

        confidence_result = session.run(hume_emotion_query).single()
        avg_confidence = confidence_result["avg_confidence"]
        print(f"✅ Average Hume AI confidence: {avg_confidence:.3f}")

        print("\n🎉 Test data insertion and queries completed successfully!")

        return True

    except Exception as error:
        print(f"❌ Test data insertion failed: {error}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # リソース解放
        if session:
            session.close()
        if driver:
            driver.close()

def main():
    """メイン実行関数"""
    print("=== Neo4j Test Data Insertion (Python) ===")
    print()

    success = insert_test_data()

    print()
    if success:
        print("🎉 Test data insertion completed!")
        sys.exit(0)
    else:
        print("❌ Test data insertion failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()
