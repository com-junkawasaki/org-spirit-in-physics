#!/usr/bin/env python3
"""
分析結果をNeo4jデータベースにインポートするスクリプト
"""

import json
import os
import sys
from datetime import datetime
import requests

# Neo4j設定
NEO4J_URI = os.getenv('NEO4J_URI', 'neo4j://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'neo4jpassword')
NEO4J_DATABASE = os.getenv('NEO4J_DATABASE', 'neo4j')

def create_neo4j_client():
    """Neo4jクライアントを作成"""
    from neo4j import GraphDatabase
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return driver

def load_analysis_results(file_path: str) -> list:
    """分析結果ファイルを読み込み"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            else:
                print(f"警告: {file_path} はリスト形式ではありません")
                return []
    except Exception as e:
        print(f"エラー: {file_path} の読み込みに失敗しました: {e}")
        return []

def get_or_create_word_stimulus(driver, word: str) -> str:
    """単語刺激語のIDを取得または作成"""
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            # 既存の単語刺激語を検索
            result = session.run("""
                MATCH (w:WordStimulus {word: $word})
                RETURN w.id as id
            """, {"word": word})

            record = result.single()
            if record:
                return record["id"]

            # 存在しない場合は新しい単語刺激語を作成
            import uuid
            new_id = str(uuid.uuid4())
            session.run("""
                CREATE (w:WordStimulus {
                    id: $id,
                    word: $word,
                    created_at: $created_at
                })
            """, {
                "id": new_id,
                "word": word,
                "created_at": datetime.now().isoformat()
            })

            return new_id
    except Exception as e:
        print(f"エラー: 単語刺激語 '{word}' の処理に失敗しました: {e}")
        # エラー時はダミーIDを返す
        return "error_id"

def find_experiment_session(driver, participant_id: str, stimulus_word: str) -> tuple:
    """実験セッションと応答データを検索"""
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            # 参加者の実験セッションを取得
            result = session.run("""
                MATCH (p:Participant {id: $participant_id})-[:HAS_SESSION]->(s:Session)
                RETURN s.id as session_id, s.session_index as session_index
                ORDER BY s.created_at DESC
                LIMIT 1
            """, {"participant_id": participant_id})

            record = result.single()
            if not record:
                print(f"警告: 参加者 {participant_id} の実験セッションが見つかりません")
                return None, None

            session_id = record["session_id"]

            # 対応する応答データを検索
            response_result = session.run("""
                MATCH (p:Participant {id: $participant_id})-[:HAS_SESSION]->(s:Session {id: $session_id})-[:HAS_RESPONSE]->(r:Response {stimulus_word: $stimulus_word})
                RETURN r.id as response_id
                LIMIT 1
            """, {
                "participant_id": participant_id,
                "session_id": session_id,
                "stimulus_word": stimulus_word
            })

            response_record = response_result.single()
            if response_record:
                return session_id, response_record["response_id"]

            # 応答データが見つからない場合は実験セッションのみ返す
            return session_id, None

    except Exception as e:
        print(f"エラー: 実験セッションの検索に失敗しました: {e}")
        return None, None

def import_analysis_results(driver, results: list, participant_id: str = None):
    """分析結果をデータベースにインポート"""
    imported_count = 0
    skipped_count = 0

    with driver.session(database=NEO4J_DATABASE) as session:
        for result in results:
            try:
                # 必須フィールドのチェック
                if not all(key in result for key in ['stimulus_word', 'response_word', 'spirit_probability']):
                    print(f"警告: 必須フィールドが不足している結果をスキップします: {result.get('id', 'unknown')}")
                    skipped_count += 1
                    continue

                # 参加者IDの決定
                current_participant_id = result.get('participant_id', participant_id)
                if not current_participant_id:
                    print(f"警告: 参加者IDが指定されていない結果をスキップします: {result.get('id', 'unknown')}")
                    skipped_count += 1
                    continue

                # 実験セッションと応答データを検索
                experiment_id, response_id = find_experiment_session(driver, current_participant_id, result['stimulus_word'])

                if not experiment_id:
                    print(f"警告: 実験セッションが見つからない結果をスキップします: {result.get('id', 'unknown')}")
                    skipped_count += 1
                    continue

                # 単語刺激語のIDを取得または作成
                word_stimulus_id = get_or_create_word_stimulus(driver, result['stimulus_word'])

                # 分析結果ノードを作成
                import uuid
                analysis_id = str(uuid.uuid4())

                # 分析結果ノードを作成し、適切なリレーションシップを確立
                session.run("""
                    MATCH (p:Participant {id: $participant_id})
                    MATCH (s:Session {id: $session_id})
                    CREATE (p)-[:HAS_ANALYSIS]->(a:AnalysisResult {
                        id: $analysis_id,
                        stimulus_word: $stimulus_word,
                        response_word: $response_word,
                        reaction_time_ms: $reaction_time_ms,
                        spirit_probability: $spirit_probability,
                        word2vec_component: $word2vec_component,
                        reaction_time_component: $reaction_time_component,
                        skin_potential_component: $skin_potential_component,
                        emotion_component: $emotion_component,
                        emotion_data: $emotion_data,
                        physiological_data: $physiological_data,
                        created_at: $created_at
                    })
                    CREATE (a)-[:STIMULUS_WORD]->(w:WordStimulus {id: $word_stimulus_id})
                    CREATE (a)-[:FROM_SESSION]->(s)
                """, {
                    "participant_id": current_participant_id,
                    "session_id": experiment_id,
                    "analysis_id": analysis_id,
                    "word_stimulus_id": word_stimulus_id,
                    "stimulus_word": result['stimulus_word'],
                    "response_word": result['response_word'],
                    "reaction_time_ms": result.get('reaction_time_ms'),
                    "spirit_probability": result['spirit_probability'],
                    "word2vec_component": result.get('word2vec_component', 0.25),
                    "reaction_time_component": result.get('reaction_time_component', 0.25),
                    "skin_potential_component": result.get('skin_potential_component', 0.25),
                    "emotion_component": result.get('emotion_component', 0.25),
                    "emotion_data": str(result.get('emotion_data', {})),
                    "physiological_data": str(result.get('physiological_data', {})),
                    "created_at": datetime.now().isoformat()
                })

                imported_count += 1
                print(f"インポート成功: {result['stimulus_word']} -> {result['response_word']} (確率: {result['spirit_probability']:.4f})")

            except Exception as e:
                print(f"エラー: 結果の処理中にエラーが発生しました {result.get('id', 'unknown')}: {e}")
                skipped_count += 1

    return imported_count, skipped_count

def main():
    """メイン処理"""
    if len(sys.argv) != 2:
        print("使用法: python import_analysis_results.py <分析結果ファイルのパス>")
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"エラー: ファイルが見つかりません: {file_path}")
        sys.exit(1)

    print(f"分析結果ファイルからインポートを開始します: {file_path}")

    # Neo4jドライバーを作成
    driver = create_neo4j_client()

    try:
        # 分析結果を読み込み
        results = load_analysis_results(file_path)

        if not results:
            print("インポートする結果がありません")
            sys.exit(1)

        print(f"読み込まれた結果数: {len(results)}")

        # 結果をインポート（最初の結果から参加者IDを取得）
        first_result = results[0]
        participant_id = first_result.get('participant_id')

        if not participant_id:
            print("エラー: 最初の結果にparticipant_idが含まれていません")
            sys.exit(1)

        print(f"対象参加者ID: {participant_id}")

        # インポート実行
        imported, skipped = import_analysis_results(driver, results, participant_id)

        print("
インポート結果:")
        print(f"  成功: {imported}")
        print(f"  スキップ: {skipped}")
        print(f"  合計: {imported + skipped}")

    finally:
        # ドライバーをクローズ
        driver.close()

if __name__ == '__main__':
    main()
