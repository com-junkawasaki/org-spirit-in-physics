#!/usr/bin/env python3
"""
analyzer から importer の機能を利用するための統合モジュール

このモジュールは、analyzer が importer のデータインポート機能を
利用するためのインターフェースを提供します。

責任分割:
- importer: データインポート機能のコア（データ構造変換、検証、バッチ処理）
- analyzer: データ分析機能のみ（統計解析、可視化、機械学習）
"""

import sys
import os
from pathlib import Path

# importer パスを追加
importer_path = Path(__file__).parent.parent.parent / "importer"
sys.path.insert(0, str(importer_path))
sys.path.insert(0, str(importer_path / "src"))

try:
    from data_importer import DataImporter
    from import_to_terminusdb import main as import_to_terminusdb_main
    IMPORTER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import from importer: {e}")
    IMPORTER_AVAILABLE = False

def import_participant_data(participant_id: str, config_path: str = None) -> bool:
    """
    参加者データをインポートする

    Args:
        participant_id: 参加者ID
        config_path: 設定ファイルのパス（オプション）

    Returns:
        bool: インポート成功の場合True
    """
    if not IMPORTER_AVAILABLE:
        print("Error: Importer module not available")
        return False

    try:
        # 設定を読み込み
        if config_path and os.path.exists(config_path):
            import yaml
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
        else:
            # デフォルト設定を使用
            import yaml
            config_path = importer_path / "config.yaml"
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config = yaml.safe_load(f)
            else:
                print("Error: No config file found")
                return False

        # データインポーターを作成
        importer = DataImporter(config)

        # 参加者データをインポート
        return importer.import_participant_data(participant_id)

    except Exception as e:
        print(f"Error importing participant data: {e}")
        return False

def run_full_import():
    """
    全ての参加者データをインポートする
    """
    if not IMPORTER_AVAILABLE:
        print("Error: Importer module not available")
        return False

    try:
        # 設定を読み込み
        import yaml
        config_path = importer_path / "config.yaml"
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
        else:
            print("Error: No config file found")
            return False

        # データインポーターを作成
        importer = DataImporter(config)

        # 全ての参加者データをインポート
        results = importer.import_all_participants()

        success_count = sum(1 for success in results.values() if success)
        total_count = len(results)

        print(f"Import completed: {success_count}/{total_count} participants successful")

        return success_count == total_count

    except Exception as e:
        print(f"Error running full import: {e}")
        return False

if __name__ == "__main__":
    # テスト実行
    print("Testing data integration...")
    success = run_full_import()
    print(f"Integration test {'PASSED' if success else 'FAILED'}")
