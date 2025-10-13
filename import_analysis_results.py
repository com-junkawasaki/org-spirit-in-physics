#!/usr/bin/env python3
"""
分析結果をArangoDBデータベースにインポートするスクリプト
"""

import json
import os
import sys
from datetime import datetime
import requests

# ArangoDB設定
ARANGODB_URL = os.getenv('ARANGODB_URL', 'http://localhost:8529')
ARANGODB_USER = os.getenv('ARANGODB_USER', 'root')
ARANGODB_PASSWORD = os.getenv('ARANGODB_PASSWORD', '')
ARANGODB_DATABASE = os.getenv('ARANGODB_DATABASE', 'spirit_in_physics')

def create_arangodb_client():
    """ArangoDBクライアントを作成"""
    from arango import ArangoClient
    client = ArangoClient(hosts=ARANGODB_URL)
    db = client.db(ARANGODB_DATABASE, username=ARANGODB_USER, password=ARANGODB_PASSWORD)
    return db

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

def get_or_create_word_stimulus(db, word: str) -> str:
    """単語刺激語のIDを取得または作成"""
    try:
        # 既存の単語刺激語を検索
        word_stimuli_collection = db.collection('word_stimuli')
        result = list(word_stimuli_collection.find({'word': word}))
        if result:
            return result[0]['_key']

        # 存在しない場合は新しい単語刺激語を作成
        import uuid
        new_id = str(uuid.uuid4())
        word_data = {
            '_key': new_id,
            'word': word,
            'created_at': datetime.now().isoformat()
        }
        word_stimuli_collection.insert(word_data)

        return new_id
    except Exception as e:
        print(f"エラー: 単語刺激語 '{word}' の処理に失敗しました: {e}")
        # エラー時はダミーIDを返す
        return "error_id"

def find_experiment_session(db, participant_id: str, stimulus_word: str) -> tuple:
    """実験セッションと応答データを検索"""
    try:
        # 参加者の実験セッションを取得
        sessions_collection = db.collection('participant_experiment_sessions')
        sessions = list(sessions_collection.find({'participant_id': participant_id}))

        if not sessions:
            print(f"警告: 参加者 {participant_id} の実験セッションが見つかりません")
            return None, None

        # 最新のセッションを使用
        session = sessions[0]
        experiment_id = session['_key']

        # 対応する応答データを検索
        responses_collection = db.collection('participant_response_data')
        responses = list(responses_collection.find({
            'participant_id': participant_id,
            'experiment_id': experiment_id,
            'stimulus_word': stimulus_word
        }))

        if responses:
            response = responses[0]
            return experiment_id, response['_key']

        # 応答データが見つからない場合は実験セッションのみ返す
        return experiment_id, None

    except Exception as e:
        print(f"エラー: 実験セッションの検索に失敗しました: {e}")
        return None, None

def import_analysis_results(db, results: list, participant_id: str = None):
    """分析結果をデータベースにインポート"""
    imported_count = 0
    skipped_count = 0

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
            experiment_id, response_id = find_experiment_session(db, current_participant_id, result['stimulus_word'])

            if not experiment_id:
                print(f"警告: 実験セッションが見つからない結果をスキップします: {result.get('id', 'unknown')}")
                skipped_count += 1
                continue

            # 単語刺激語のIDを取得または作成
            word_stimulus_id = get_or_create_word_stimulus(db, result['stimulus_word'])

            # インポートデータを作成
            import_data = {
                'participant_id': current_participant_id,
                'experiment_id': experiment_id,
                'word_stimulus_id': word_stimulus_id,
                'stimulus_word': result['stimulus_word'],
                'response_word': result['response_word'],
                'reaction_time_ms': result.get('reaction_time_ms'),
                'spirit_probability': result['spirit_probability'],
                'word2vec_component': result.get('word2vec_component', 0.25),  # デフォルト値
                'reaction_time_component': result.get('reaction_time_component', 0.25),  # デフォルト値
                'skin_potential_component': result.get('skin_potential_component', 0.25),  # デフォルト値
                'emotion_component': result.get('emotion_component', 0.25),  # デフォルト値
                'emotion_data': result.get('emotion_data', {}),
                'physiological_data': result.get('physiological_data', {})
            }

            # データベースに挿入
            import uuid
            import_data['_key'] = str(uuid.uuid4())
            analysis_collection = db.collection('participant_analysis_results')
            insert_result = analysis_collection.insert(import_data)

            if insert_result:
                imported_count += 1
                print(f"インポート成功: {result['stimulus_word']} -> {result['response_word']} (確率: {result['spirit_probability']:.4f})")
            else:
                print(f"警告: データ挿入に失敗しました: {result.get('id', 'unknown')}")
                skipped_count += 1

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

    # ArangoDBクライアントを作成
    db = create_arangodb_client()

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
    imported, skipped = import_analysis_results(db, results, participant_id)

    print("
インポート結果:")
    print(f"  成功: {imported}")
    print(f"  スキップ: {skipped}")
    print(f"  合計: {imported + skipped}")

if __name__ == '__main__':
    main()
