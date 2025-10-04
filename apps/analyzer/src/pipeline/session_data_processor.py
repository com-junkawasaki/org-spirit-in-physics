#!/usr/bin/env python3
"""
セッションデータの時系列処理と可視化システム
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class SessionDataProcessor:
    """セッションデータの時系列処理と可視化"""

    def __init__(self):
        self.session_events = []
        self.timeline_data = []

    def load_session_data(self, session_file_path: str) -> Dict[str, Any]:
        """セッションデータファイルを読み込み"""
        try:
            with open(session_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            logging.info(f"Loaded session data with {len(data.get('events', []))} events")
            return data
        except Exception as e:
            logging.error(f"Failed to load session data: {e}")
            return {}

    def process_timeline_events(self, session_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """セッションデータから時系列イベントを抽出"""
        events = session_data.get('events', [])
        timeline_events = []

        # 基準時刻（最初のparticipant_initializedイベントのタイムスタンプ）
        base_timestamp = None
        for event in events:
            if event['type'] == 'participant_initialized':
                base_timestamp = event['timestamp']
                break

        if not base_timestamp:
            logging.error("No participant_initialized event found")
            return []

        for event in events:
            relative_time_ms = event['timestamp'] - base_timestamp

            timeline_event = {
                'timestamp': event['timestamp'],
                'relative_time_ms': relative_time_ms,
                'relative_time_sec': relative_time_ms / 1000,
                'event_type': event['type'],
                'payload': event.get('payload', {}),
                'word': event.get('payload', {}).get('word', ''),
                'key': event.get('payload', {}).get('key', '')
            }
            timeline_events.append(timeline_event)

        # 時系列でソート
        timeline_events.sort(key=lambda x: x['timestamp'])

        logging.info(f"Processed {len(timeline_events)} timeline events")
        return timeline_events

    def create_timeline_dataframe(self, timeline_events: List[Dict[str, Any]]) -> pd.DataFrame:
        """時系列イベントをDataFrameに変換"""
        df = pd.DataFrame(timeline_events)

        # 時間帯を追加（実験開始からの経過時間）
        if not df.empty:
            df['time_from_start'] = pd.to_timedelta(df['relative_time_ms'], unit='ms')
            df['time_category'] = pd.cut(df['relative_time_sec'],
                                       bins=[0, 60, 300, 600, 1200, float('inf')],
                                       labels=['0-1min', '1-5min', '5-10min', '10-20min', '20min+'])

        return df

    def analyze_word_response_patterns(self, timeline_df: pd.DataFrame) -> Dict[str, Any]:
        """単語応答パターンを分析"""
        analysis = {
            'total_words': len(timeline_df[timeline_df['event_type'] == 'word_displayed']),
            'avg_response_time': 0,
            'response_patterns': [],
            'word_frequency': {},
            'time_distribution': {}
        }

        # 単語表示イベントを抽出
        word_events = timeline_df[timeline_df['event_type'] == 'word_displayed'].copy()

        if not word_events.empty:
            # 単語の頻度分布
            word_counts = word_events['word'].value_counts()
            analysis['word_frequency'] = word_counts.to_dict()

            # 時間帯別の分布
            time_dist = word_events.groupby('time_category').size().to_dict()
            analysis['time_distribution'] = time_dist

        return analysis

    def detect_response_timing(self, timeline_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """応答タイミングを検出"""
        response_events = []

        word_events = timeline_df[timeline_df['event_type'] == 'word_displayed']
        response_window_events = timeline_df[timeline_df['event_type'] == 'response_window_opened']
        speech_events = timeline_df[timeline_df['event_type'] == 'speech_detected']

        for _, word_event in word_events.iterrows():
            word = word_event['word']
            word_time = word_event['timestamp']

            # 対応するresponse_window_openedイベントを探す
            response_window = response_window_events[
                (response_window_events['word'] == word) &
                (response_window_events['timestamp'] > word_time)
            ]

            if not response_window.empty:
                response_start = response_window.iloc[0]['timestamp']

                # 対応するspeech_detectedイベントを探す
                speech = speech_events[
                    (speech_events['word'] == word) &
                    (speech_events['timestamp'] > response_start)
                ]

                response_timing = {
                    'word': word,
                    'word_displayed_time': word_time,
                    'response_window_opened_time': response_start,
                    'speech_detected_time': speech.iloc[0]['timestamp'] if not speech.empty else None,
                    'response_time_ms': speech.iloc[0]['timestamp'] - word_time if not speech.empty else None
                }
                response_events.append(response_timing)

        return response_events

    def generate_session_summary(self, session_data: Dict[str, Any], timeline_df: pd.DataFrame) -> Dict[str, Any]:
        """セッションの要約を生成"""
        summary = {
            'participant_id': session_data.get('participantId', ''),
            'total_events': len(session_data.get('events', [])),
            'session_duration_ms': 0,
            'word_count': 0,
            'avg_response_time_ms': 0,
            'event_types': {},
            'time_ranges': {}
        }

        if not timeline_df.empty:
            # セッション期間を計算
            min_time = timeline_df['timestamp'].min()
            max_time = timeline_df['timestamp'].max()
            summary['session_duration_ms'] = max_time - min_time

            # イベントタイプの分布
            event_counts = timeline_df['event_type'].value_counts()
            summary['event_types'] = event_counts.to_dict()

            # 単語数
            word_events = timeline_df[timeline_df['event_type'] == 'word_displayed']
            summary['word_count'] = len(word_events)

            # 応答タイミングの分析
            response_events = self.detect_response_timing(timeline_df)
            if response_events:
                response_times = [r['response_time_ms'] for r in response_events if r['response_time_ms']]
                if response_times:
                    summary['avg_response_time_ms'] = sum(response_times) / len(response_times)

        return summary

    def create_visualization_data(self, session_file_path: str) -> Dict[str, Any]:
        """可視化用のデータを生成"""
        session_data = self.load_session_data(session_file_path)

        if not session_data:
            return {}

        timeline_events = self.process_timeline_events(session_data)
        timeline_df = self.create_timeline_dataframe(timeline_events)
        summary = self.generate_session_summary(session_data, timeline_df)

        # 可視化用データを構造化
        visualization_data = {
            'session_info': {
                'participant_id': session_data.get('participantId', ''),
                'total_events': len(session_data.get('events', [])),
                'duration_ms': summary.get('session_duration_ms', 0),
                'word_count': summary.get('word_count', 0),
                'avg_response_time_ms': summary.get('avg_response_time_ms', 0)
            },
            'timeline_events': timeline_events,
            'event_analysis': {
                'event_types': summary.get('event_types', {}),
                'word_frequency': summary.get('word_frequency', {}),
                'time_distribution': summary.get('time_distribution', {})
            },
            'response_patterns': self.detect_response_timing(timeline_df),
            'summary': summary
        }

        return visualization_data

    def analyze_data_completeness(self, participant_id: str, data_dir: str) -> Dict[str, Any]:
        """参加者ごとのデータ完全性を分析"""
        participant_path = Path(data_dir) / participant_id
        completeness = {
            'participant_id': participant_id,
            'has_consent': False,
            'has_session_data': False,
            'has_video_files': False,
            'has_hume_data': False,
            'session_count': 0,
            'word_count': 0,
            'response_count': 0,
            'data_quality_score': 0
        }

        # 同意書ファイルの確認
        consent_file = participant_path / 'consent.json'
        completeness['has_consent'] = consent_file.exists()

        # セッションデータファイルの確認
        session_file = participant_path / 'session_data.json'
        if session_file.exists():
            completeness['has_session_data'] = True
            session_data = self.load_session_data(str(session_file))
            if session_data:
                events = session_data.get('events', [])
                word_events = [e for e in events if e.get('type') == 'word_displayed']
                completeness['word_count'] = len(word_events)
                completeness['session_count'] = len(set(e.get('payload', {}).get('session', 1) for e in events if 'session' in e.get('payload', {})))

        # ビデオファイルの確認
        video_files = list(participant_path.glob('session-*-video.webm'))
        completeness['has_video_files'] = len(video_files) > 0

        # Humeデータファイルの確認
        hume_files = list(participant_path.glob('HumeAI_*'))
        completeness['has_hume_data'] = len(hume_files) > 0

        # データ品質スコアの計算（0-100）
        quality_score = 0
        if completeness['has_consent']: quality_score += 20
        if completeness['has_session_data']: quality_score += 30
        if completeness['has_video_files']: quality_score += 25
        if completeness['has_hume_data']: quality_score += 25
        completeness['data_quality_score'] = quality_score

        return completeness
