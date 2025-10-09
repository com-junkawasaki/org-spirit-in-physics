#!/usr/bin/env python3
"""
分析結果をSupabaseデータベースにインポートするスクリプト
"""

import json
import os
import sys
from datetime import datetime
from supabase import create_client, Client
import requests

# Supabase設定
SUPABASE_URL = os.getenv('SUPABASE_URL', 'http://127.0.0.1:54321')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0')

def create_supabase_client() -> Client:
    """Supabaseクライアントを作成"""
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

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

def get_or_create_word_stimulus(supabase: Client, word: str) -> int:
    """単語刺激語のIDを取得または作成"""
    try:
        # 既存の単語刺激語を検索
        result = supabase.table('word_stimuli').select('id').eq('word', word).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]['id']

        # 存在しない場合は新しいIDを生成（実際のシステムでは適切な方法で生成）
        # ここでは単純にタイムスタンプベースのIDを生成
        import time
        new_id = int(time.time() * 1000) % 1000000

        # 新しい単語刺激語を作成
        supabase.table('word_stimuli').insert({
            'id': new_id,
            'word': word
        }).execute()

        return new_id
    except Exception as e:
        print(f"エラー: 単語刺激語 '{word}' の処理に失敗しました: {e}")
        # エラー時はダミーIDを返す
        return 999999

def find_experiment_session(supabase: Client, participant_id: str, stimulus_word: str) -> tuple:
    """実験セッションと応答データを検索"""
    try:
        # 参加者の実験セッションを取得
        sessions = supabase.table('participant_experiment_sessions').select('*').eq('participant_id', participant_id).execute()

        if not sessions.data or len(sessions.data) == 0:
            print(f"警告: 参加者 {participant_id} の実験セッションが見つかりません")
            return None, None

        # 最新のセッションを使用
        session = sessions.data[0]
        experiment_id = session['id']

        # 対応する応答データを検索
        responses = supabase.table('participant_response_data').select('*').eq('participant_id', participant_id).eq('experiment_id', experiment_id).eq('stimulus_word', stimulus_word).execute()

        if responses.data and len(responses.data) > 0:
            response = responses.data[0]
            return experiment_id, response['id']

        # 応答データが見つからない場合は実験セッションのみ返す
        return experiment_id, None

    except Exception as e:
        print(f"エラー: 実験セッションの検索に失敗しました: {e}")
        return None, None

def import_analysis_results(supabase: Client, results: list, participant_id: str = None):
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
            experiment_id, response_id = find_experiment_session(supabase, current_participant_id, result['stimulus_word'])

            if not experiment_id:
                print(f"警告: 実験セッションが見つからない結果をスキップします: {result.get('id', 'unknown')}")
                skipped_count += 1
                continue

            # 単語刺激語のIDを取得または作成
            word_stimulus_id = get_or_create_word_stimulus(supabase, result['stimulus_word'])

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
            insert_result = supabase.table('participant_analysis_results').insert(import_data).execute()

            if insert_result.data:
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

    # Supabaseクライアントを作成
    supabase = create_supabase_client()

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
    imported, skipped = import_analysis_results(supabase, results, participant_id)

    print("
インポート結果:")
    print(f"  成功: {imported}")
    print(f"  スキップ: {skipped}")
    print(f"  合計: {imported + skipped}")

if __name__ == '__main__':
    main()
