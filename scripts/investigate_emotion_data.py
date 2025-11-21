#!/usr/bin/env python3
"""
感情データの存在状況を調査するスクリプト
"""
import os
import sys
import asyncio
import asyncpg
from pathlib import Path

async def investigate_emotion_data(participant_id: str, session_id: str = None):
    """感情データの存在状況を調査"""
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/postgres'
    )
    
    conn = await asyncpg.connect(database_url)
    
    try:
        print(f"=== 感情データ調査: Participant {participant_id} ===\n")
        
        # 1. セッション情報を取得
        if session_id:
            session_query = "SELECT id, session_index, start_ts, end_ts FROM sessions WHERE id::text = $1"
            session_row = await conn.fetchrow(session_query, session_id)
        else:
            session_query = "SELECT id, session_index, start_ts, end_ts FROM sessions WHERE participant_id::text = $1 ORDER BY session_index LIMIT 1"
            session_row = await conn.fetchrow(session_query, participant_id)
        
        if not session_row:
            print("❌ セッションが見つかりません")
            return
        
        session_id = str(session_row['id'])
        session_index = session_row['session_index']
        start_ts = session_row['start_ts']
        end_ts = session_row['end_ts']
        
        print(f"セッションID: {session_id}")
        print(f"セッションインデックス: {session_index}")
        print(f"開始時刻: {start_ts}")
        print(f"終了時刻: {end_ts}\n")
        
        # 2. 感情データテーブルの存在確認とカウント
        emotion_tables = [
            ('burst_emotion_data', 'burst'),
            ('face_emotion_data', 'face'),
            ('language_emotion_data', 'language'),
            ('prosody_emotion_data', 'prosody'),
        ]
        
        emotion_counts = {}
        for table_name, emotion_type in emotion_tables:
            # テーブル存在確認
            table_exists = await conn.fetchval(
                """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = $1
                )
                """,
                table_name
            )
            
            if not table_exists:
                print(f"⚠️ テーブル {table_name} が存在しません")
                emotion_counts[emotion_type] = 0
                continue
            
            # セッションIDでカウント
            count_query = f"SELECT COUNT(*) FROM {table_name} WHERE session_id::text = $1"
            count = await conn.fetchval(count_query, session_id)
            emotion_counts[emotion_type] = count
            
            print(f"{emotion_type}: {count}件")
            
            # サンプルデータを表示
            if count > 0:
                sample_query = f"SELECT begin_time, end_time, emotion_scores FROM {table_name} WHERE session_id::text = $1 ORDER BY begin_time LIMIT 3"
                samples = await conn.fetch(sample_query, session_id)
                print(f"  サンプルデータ:")
                for i, sample in enumerate(samples[:3], 1):
                    begin_time = sample['begin_time']
                    end_time = sample.get('end_time')
                    emotion_scores = sample['emotion_scores']
                    if isinstance(emotion_scores, str):
                        import json
                        emotion_scores = json.loads(emotion_scores)
                    print(f"    [{i}] begin_time: {begin_time}, end_time: {end_time}, emotions: {list(emotion_scores.keys())[:5] if isinstance(emotion_scores, dict) else 'N/A'}")
        
        print()
        
        # 3. timeline_pointsの感情データを確認
        timeline_query = """
            SELECT 
                COUNT(*) as total_points,
                COUNT(CASE WHEN emotions IS NOT NULL AND emotions != '[]'::jsonb THEN 1 END) as points_with_emotions,
                COUNT(CASE WHEN jsonb_array_length(emotions) > 0 THEN 1 END) as points_with_emotion_array
            FROM timeline_points
            WHERE session_id::text = $1
        """
        timeline_stats = await conn.fetchrow(timeline_query, session_id)
        
        if timeline_stats:
            total_points = timeline_stats['total_points']
            points_with_emotions = timeline_stats['points_with_emotions']
            points_with_emotion_array = timeline_stats['points_with_emotion_array']
            
            print(f"=== Timeline Points ===")
            print(f"総ポイント数: {total_points}")
            print(f"感情データあり: {points_with_emotions}")
            print(f"感情配列あり: {points_with_emotion_array}")
            
            # 感情データの種類別カウント
            if points_with_emotion_array > 0:
                emotion_type_query = """
                    SELECT 
                        jsonb_array_elements(emotions)->>'fileType' as file_type,
                        COUNT(*) as count
                    FROM timeline_points
                    WHERE session_id::text = $1
                    AND jsonb_array_length(emotions) > 0
                    GROUP BY jsonb_array_elements(emotions)->>'fileType'
                """
                emotion_types = await conn.fetch(emotion_type_query, session_id)
                print(f"\n感情データ種類別:")
                for row in emotion_types:
                    print(f"  {row['file_type']}: {row['count']}件")
                
                # サンプル感情データを表示
                sample_emotion_query = """
                    SELECT word, emotions
                    FROM timeline_points
                    WHERE session_id::text = $1
                    AND jsonb_array_length(emotions) > 0
                    ORDER BY time
                    LIMIT 3
                """
                sample_emotions = await conn.fetch(sample_emotion_query, session_id)
                print(f"\nサンプル感情データ:")
                for i, sample in enumerate(sample_emotions, 1):
                    word = sample['word']
                    emotions = sample['emotions']
                    print(f"  [{i}] Word: {word}, Emotions: {emotions}")
        
        print()
        
        # 4. 問題の診断
        print("=== 診断 ===")
        total_emotion_records = sum(emotion_counts.values())
        if total_emotion_records == 0:
            print("❌ 感情データテーブルにデータが存在しません")
            print("   → /api/import/emotions エンドポイントで感情データをインポートしてください")
        else:
            print(f"✓ 感情データテーブルに {total_emotion_records} 件のデータが存在します")
            
            if points_with_emotion_array == 0:
                print("❌ timeline_pointsに感情データが反映されていません")
                print("   → /api/import/timeline エンドポイントでタイムラインを再インポートしてください")
            else:
                print(f"✓ timeline_pointsに {points_with_emotion_array} 件の感情データが反映されています")
        
        # 5. タイムスタンプマッチングの確認
        if total_emotion_records > 0 and points_with_emotion_array == 0:
            print("\n⚠️ タイムスタンプマッチングの問題の可能性があります")
            print("   → 感情データのbegin_timeとイベントのtimestampが±2秒以内でマッチしている必要があります")
            
            # イベントのタイムスタンプ範囲を確認
            events_query = """
                SELECT events
                FROM sessions
                WHERE id::text = $1
            """
            events_json = await conn.fetchval(events_query, session_id)
            if events_json:
                import json
                events = json.loads(events_json) if isinstance(events_json, str) else events_json
                word_events = [e for e in events if e.get('type') == 'word_displayed']
                if word_events:
                    timestamps = [e.get('timestamp') for e in word_events if e.get('timestamp')]
                    if timestamps:
                        min_ts = min(timestamps)
                        max_ts = max(timestamps)
                        print(f"   イベントタイムスタンプ範囲: {min_ts} - {max_ts}")
                        
                        # 感情データのタイムスタンプ範囲を確認（相対時間）
                        for table_name, emotion_type in emotion_tables:
                            if emotion_counts[emotion_type] > 0:
                                time_range_query = f"""
                                    SELECT 
                                        MIN(begin_time) as min_time,
                                        MAX(COALESCE(end_time, begin_time + 1.0)) as max_time
                                    FROM {table_name}
                                    WHERE session_id::text = $1
                                """
                                time_range = await conn.fetchrow(time_range_query, session_id)
                                if time_range:
                                    min_time = time_range['min_time']
                                    max_time = time_range['max_time']
                                    print(f"   {emotion_type} タイムスタンプ範囲: {min_time} - {max_time} (相対秒)")
        
    finally:
        await conn.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python investigate_emotion_data.py <participant_id> [session_id]")
        sys.exit(1)
    
    participant_id = sys.argv[1]
    session_id = sys.argv[2] if len(sys.argv) > 2 else None
    
    asyncio.run(investigate_emotion_data(participant_id, session_id))

