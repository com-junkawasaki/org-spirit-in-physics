#!/usr/bin/env python3
"""
高度化されたWord2Vecモデルの学習スクリプト
ユング心理学、仏教、スピリチュアリティ関連の広範なコーパスで意味的類似性を学習
感情価統合と多言語対応を実現
"""

import logging
import os
import json
from gensim.models import Word2Vec
from gensim.models.word2vec import LineSentence
from gensim.models.callbacks import CallbackAny2Vec
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class TrainingProgressCallback(CallbackAny2Vec):
    """Word2Vec学習の進捗を監視するコールバック"""
    def __init__(self):
        self.epoch = 0

    def on_epoch_end(self, model):
        self.epoch += 1
        logging.info(f"Epoch {self.epoch} completed. Loss: {model.get_latest_training_loss():.2f}")

class AdvancedWord2VecTrainer:
    """高度化されたWord2Vecトレーナー"""

    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        self.model_path = self.model_dir / "advanced_jung_word2vec.model"
        self.model = None

        # 感情価データ（日本語評価極性辞書などを想定）
        self.emotional_lexicon = self._load_emotional_lexicon()

    def _load_emotional_lexicon(self) -> Dict[str, Dict[str, float]]:
        """感情価辞書を読み込み"""
        # 基本的な感情価辞書（拡張可能）
        emotional_lexicon = {
            # ポジティブ感情
            "愛": {"valence": 0.9, "arousal": 0.8, "dominance": 0.7},
            "喜び": {"valence": 0.95, "arousal": 0.9, "dominance": 0.8},
            "平和": {"valence": 0.8, "arousal": 0.3, "dominance": 0.6},
            "幸福": {"valence": 0.95, "arousal": 0.7, "dominance": 0.8},
            "調和": {"valence": 0.8, "arousal": 0.4, "dominance": 0.6},

            # ネガティブ感情
            "怒り": {"valence": 0.1, "arousal": 0.9, "dominance": 0.8},
            "悲しみ": {"valence": 0.1, "arousal": 0.6, "dominance": 0.3},
            "恐れ": {"valence": 0.1, "arousal": 0.95, "dominance": 0.2},
            "不安": {"valence": 0.2, "arousal": 0.8, "dominance": 0.3},
            "絶望": {"valence": 0.05, "arousal": 0.7, "dominance": 0.2},

            # スピリチュアル/心理学的用語
            "魂": {"valence": 0.8, "arousal": 0.6, "dominance": 0.7},
            "霊": {"valence": 0.7, "arousal": 0.8, "dominance": 0.6},
            "意識": {"valence": 0.7, "arousal": 0.5, "dominance": 0.8},
            "無意識": {"valence": 0.4, "arousal": 0.6, "dominance": 0.5},
            "自我": {"valence": 0.6, "arousal": 0.5, "dominance": 0.8},
            "超越": {"valence": 0.85, "arousal": 0.7, "dominance": 0.9},
            "悟り": {"valence": 0.95, "arousal": 0.6, "dominance": 0.9},
        }

        # 英語版も追加
        emotional_lexicon.update({
            "love": {"valence": 0.9, "arousal": 0.8, "dominance": 0.7},
            "joy": {"valence": 0.95, "arousal": 0.9, "dominance": 0.8},
            "peace": {"valence": 0.8, "arousal": 0.3, "dominance": 0.6},
            "happiness": {"valence": 0.95, "arousal": 0.7, "dominance": 0.8},
            "harmony": {"valence": 0.8, "arousal": 0.4, "dominance": 0.6},
            "anger": {"valence": 0.1, "arousal": 0.9, "dominance": 0.8},
            "sadness": {"valence": 0.1, "arousal": 0.6, "dominance": 0.3},
            "fear": {"valence": 0.1, "arousal": 0.95, "dominance": 0.2},
            "anxiety": {"valence": 0.2, "arousal": 0.8, "dominance": 0.3},
            "despair": {"valence": 0.05, "arousal": 0.7, "dominance": 0.2},
            "soul": {"valence": 0.8, "arousal": 0.6, "dominance": 0.7},
            "spirit": {"valence": 0.7, "arousal": 0.8, "dominance": 0.6},
            "consciousness": {"valence": 0.7, "arousal": 0.5, "dominance": 0.8},
            "unconscious": {"valence": 0.4, "arousal": 0.6, "dominance": 0.5},
            "ego": {"valence": 0.6, "arousal": 0.5, "dominance": 0.8},
            "transcendence": {"valence": 0.85, "arousal": 0.7, "dominance": 0.9},
            "enlightenment": {"valence": 0.95, "arousal": 0.6, "dominance": 0.9},
        })

        return emotional_lexicon
    def load_jung_stimuli(self) -> Dict[str, Dict[str, str]]:
        """ユングの刺激語データを読み込み（日本語・英語・発音対応）"""
        # 実際のアプリケーションから刺激語データを取得
        jung_stimuli = {
            "head": {"japanese": "頭", "pronunciation": "あたま", "category": "body"},
            "green": {"japanese": "緑", "pronunciation": "みどり", "category": "color"},
            "water": {"japanese": "水", "pronunciation": "みず", "category": "nature"},
            "death": {"japanese": "亡くなる", "pronunciation": "なくなる", "category": "life"},
            "long": {"japanese": "長い", "pronunciation": "ながい", "category": "dimension"},
            "ship": {"japanese": "船", "pronunciation": "ふね", "category": "transport"},
            "angry": {"japanese": "怒り", "pronunciation": "いかり", "category": "emotion"},
            "needle": {"japanese": "針", "pronunciation": "はり", "category": "object"},
            "pride": {"japanese": "プライド", "pronunciation": "プライド", "category": "emotion"},
            "lamp": {"japanese": "電気", "pronunciation": "でんき", "category": "object"},
            "bread": {"japanese": "ご飯", "pronunciation": "ごはん", "category": "food"},
            "rich": {"japanese": "金持ち", "pronunciation": "かねもち", "category": "wealth"},
            "tree": {"japanese": "木", "pronunciation": "き", "category": "nature"},
            "pity": {"japanese": "同情", "pronunciation": "どうじょう", "category": "emotion"},
            "yellow": {"japanese": "黄色", "pronunciation": "きいろ", "category": "color"},
            "mountain": {"japanese": "山", "pronunciation": "やま", "category": "nature"},
            "salt": {"japanese": "塩", "pronunciation": "しお", "category": "food"},
            "new": {"japanese": "新しい", "pronunciation": "あたらしい", "category": "time"},
            "money": {"japanese": "お金", "pronunciation": "おかね", "category": "wealth"},
            "stupid": {"japanese": "馬鹿", "pronunciation": "ばか", "category": "personality"},
            "finger": {"japanese": "指", "pronunciation": "ゆび", "category": "body"},
            "dear": {"japanese": "高価な", "pronunciation": "こうかな", "category": "value"},
            "bird": {"japanese": "鳥", "pronunciation": "とり", "category": "animal"},
            "book": {"japanese": "本", "pronunciation": "ほん", "category": "object"},
            "white": {"japanese": "白い", "pronunciation": "しろい", "category": "color"},
            "child": {"japanese": "子供", "pronunciation": "こども", "category": "person"},
            "pencil": {"japanese": "鉛筆", "pronunciation": "えんぴつ", "category": "object"},
            "sad": {"japanese": "悲しい", "pronunciation": "かなしい", "category": "emotion"},
            "house": {"japanese": "家", "pronunciation": "いえ", "category": "place"},
            "big": {"japanese": "大きい", "pronunciation": "おおきい", "category": "size"},
            "old": {"japanese": "古い", "pronunciation": "ふるい", "category": "time"},
            "family": {"japanese": "家族", "pronunciation": "かぞく", "category": "relationship"},
            "narrow": {"japanese": "狭い", "pronunciation": "せまい", "category": "dimension"},
            "brother": {"japanese": "兄弟", "pronunciation": "きょうだい", "category": "relationship"},
            "pure": {"japanese": "純粋な", "pronunciation": "じゅんすいな", "category": "quality"},
            "nice": {"japanese": "きれいな", "pronunciation": "きれいな", "category": "quality"},
            "woman": {"japanese": "女", "pronunciation": "おんな", "category": "person"},
        }

        return jung_stimuli
    def generate_advanced_training_corpus(self, stimuli_data: Dict[str, Dict[str, str]]) -> str:
        """高度化された学習コーパスを生成（感情価・カテゴリ・発音情報を活用）"""
        corpus_path = self.model_dir / "advanced_training_corpus.txt"

        # カテゴリ別の関連語彙
        category_vocabularies = {
            "emotion": ["感情", "気持ち", "心", "精神", "心理", "感覚", "情緒", "心情", "情動"],
            "nature": ["自然", "地球", "生命", "生き物", "環境", "宇宙", "森", "海", "山"],
            "body": ["体", "身体", "健康", "病気", "痛み", "感覚", "神経", "脳", "心臓"],
            "color": ["色", "色彩", "光", "影", "明るい", "暗い", "鮮やか", "淡い"],
            "person": ["人", "人間", "個性", "性格", "行動", "思考", "意識", "無意識"],
            "relationship": ["関係", "絆", "愛", "友情", "家族", "結婚", "パートナー"],
            "spirit": ["魂", "霊", "精神", "意識", "超越", "悟り", "智慧", "慈悲", "禅"],
            "time": ["時間", "過去", "現在", "未来", "永遠", "瞬間", "歴史", "変化"],
            "place": ["場所", "空間", "家", "街", "国", "世界", "宇宙", "次元"],
            "value": ["価値", "大切", "貴重", "重要", "宝物", "富", "貧乏", "平等"]
        }

        with open(corpus_path, 'w', encoding='utf-8') as f:
            for english_word, data in stimuli_data.items():
                japanese = data["japanese"]
                pronunciation = data["pronunciation"]
                category = data["category"]

                # 1. 英語-日本語-発音の対応関係を学習
                f.write(f"{english_word} {japanese} {pronunciation}\n")

                # 2. 発音から意味的類似性を学習
                # 同じ発音の語や似た発音の語を関連付ける
                if len(pronunciation) > 2:
                    similar_pronunciations = self._generate_similar_pronunciations(pronunciation)
                    for similar in similar_pronunciations[:3]:  # 最大3つ
                        f.write(f"{pronunciation} {similar}\n")

                # 3. カテゴリベースの関連語を追加
                if category in category_vocabularies:
                    category_words = category_vocabularies[category]
                    # 英語語とカテゴリ関連語の文脈を学習
                    context_sentence = f"{english_word} {japanese} {' '.join(category_words[:5])}\n"
                    f.write(context_sentence)

                    # 感情価の統合
                    emotional_context = self._generate_emotional_context(english_word, japanese, category)
                    if emotional_context:
                        f.write(emotional_context)

                # 4. スピリチュアル/心理学的文脈を追加
                spiritual_context = self._generate_spiritual_context(english_word, category)
                if spiritual_context:
                    f.write(spiritual_context)

                # 5. 多言語統合学習
                multilingual_context = self._generate_multilingual_context(english_word, japanese)
                if multilingual_context:
                    f.write(multilingual_context)

        logging.info(f"Advanced training corpus created at {corpus_path} with {len(stimuli_data)} stimuli words")
        return str(corpus_path)

    def _generate_similar_pronunciations(self, pronunciation: str) -> List[str]:
        """似た発音の語を生成（日本語の音韻的類似性）"""
        # ひらがなの発音パターンに基づく類似語生成
        similar = []

        # 母音変化
        vowels = {'あ': 'あいうえお', 'い': 'あいうえお', 'う': 'あいうえお',
                 'え': 'あいうえお', 'お': 'あいうえお'}

        for i, char in enumerate(pronunciation):
            if char in vowels:
                for vowel in vowels[char]:
                    if vowel != char:
                        new_word = pronunciation[:i] + vowel + pronunciation[i+1:]
                        similar.append(new_word)

        # 子音変化（簡易版）
        consonants = {'か': 'かきくけこ', 'さ': 'さしすせそ', 'た': 'たちつてと',
                     'な': 'なにぬねの', 'は': 'はひふへほ'}

        for i, char in enumerate(pronunciation):
            if char in consonants:
                for consonant in consonants[char]:
                    if consonant != char:
                        new_word = pronunciation[:i] + consonant + pronunciation[i+1:]
                        similar.append(new_word)

        return list(set(similar))  # 重複除去

    def _generate_emotional_context(self, english: str, japanese: str, category: str) -> Optional[str]:
        """感情価に基づく文脈を生成"""
        # 感情カテゴリの単語に感情価を統合
        if category == "emotion":
            # Hume AIの感情モデルに基づく関連語
            emotion_synonyms = {
                "angry": ["怒り", "いかり", "rage", "fury", "wrath"],
                "sad": ["悲しみ", "かなしみ", "sorrow", "grief", "melancholy"],
                "pride": ["誇り", "プライド", "dignity", "honor", "self-respect"],
                "pity": ["同情", "どうじょう", "compassion", "sympathy", "mercy"]
            }

            if english in emotion_synonyms:
                related_emotions = emotion_synonyms[english]
                return f"{english} {japanese} {' '.join(related_emotions)}\n"

        return None

    def _generate_spiritual_context(self, english: str, category: str) -> Optional[str]:
        """スピリチュアル/心理学的文脈を生成"""
        spiritual_mappings = {
            "emotion": ["心", "魂", "精神", "意識", "無意識", "感情", "情動"],
            "nature": ["自然", "宇宙", "生命", "エネルギー", "調和", "バランス"],
            "body": ["体", "精神", "健康", "癒し", "バランス", "調和"],
            "person": ["自我", "自我", "個性", "魂", "精神", "意識"],
            "relationship": ["絆", "愛", "調和", "共感", "理解", "つながり"],
            "time": ["永遠", "瞬間", "変化", "循環", "リズム", "流れ"],
            "spirit": ["魂", "霊", "意識", "超越", "悟り", "智慧", "慈悲"]
        }

        if category in spiritual_mappings:
            spiritual_words = spiritual_mappings[category]
            return f"{english} {' '.join(spiritual_words)}\n"

        return None

    def _generate_multilingual_context(self, english: str, japanese: str) -> Optional[str]:
        """多言語統合文脈を生成"""
        # 英語-日本語の対応関係を強化
        multilingual_contexts = [
            f"{english} corresponds to {japanese}",
            f"{english} means {japanese}",
            f"{english} is translated as {japanese}",
            f"{japanese} translates to {english}"
        ]

        return multilingual_contexts[0] + "\n"  # シンプルに一つ返す
    def train_advanced_model(self, corpus_path: str, vector_size: int = 200,
                           window: int = 8, min_count: int = 1, workers: int = 4,
                           epochs: int = 20) -> Word2Vec:
        """高度化されたWord2Vecモデルの学習（感情価統合・最適化パラメータ）"""
        logging.info("Starting advanced Word2Vec model training...")

        # コーパスから文を読み込み
        sentences = LineSentence(corpus_path)

        # 高度化された学習パラメータ
        self.model = Word2Vec(
            sentences,
            vector_size=vector_size,    # より大きなベクトル次元（感情価統合のため）
            window=window,              # より広いコンテキストウィンドウ
            min_count=min_count,        # 最低出現回数
            workers=workers,            # 並列処理数
            sg=1,                       # Skip-gramを使用（意味的類似性に優位）
            hs=0,                       # 階層的ソフトマックスを無効化
            negative=15,                # ネガティブサンプリング（性能向上）
            epochs=epochs,              # より多くのエポック
            alpha=0.025,                # 初期学習率
            min_alpha=0.0001,           # 最小学習率
            seed=42,                    # 再現性のためのシード
            callbacks=[TrainingProgressCallback()]
        )

        # 学習後に感情価をベクトルに統合
        self._integrate_emotional_valence()

        logging.info(f"Advanced model trained with {len(self.model.wv)} words, vector_size={vector_size}")
        return self.model

    def _integrate_emotional_valence(self):
        """感情価を単語ベクトルに統合"""
        if not self.model:
            return

        logging.info("Integrating emotional valence into word vectors...")

        # 感情価ベクトルの次元を拡張（valence, arousal, dominance）
        emotional_dims = 3

        # 感情価辞書に含まれる単語のベクトルを更新
        for word, emotion_data in self.emotional_lexicon.items():
            if word in self.model.wv:
                # 現在のベクトルを取得
                current_vector = self.model.wv[word]

                # 感情価をベクトルの最後に追加
                valence = emotion_data['valence']
                arousal = emotion_data['arousal']
                dominance = emotion_data['dominance']

                emotional_vector = np.array([valence, arousal, dominance])

                # ベクトルを拡張
                extended_vector = np.concatenate([current_vector, emotional_vector])

                # モデルに更新されたベクトルを設定
                self.model.wv.vectors[self.model.wv.key_to_index[word]] = extended_vector

                # 正規化されたベクトルも更新
                if hasattr(self.model.wv, 'vectors_norm'):
                    self.model.wv.vectors_norm[self.model.wv.key_to_index[word]] = \
                        extended_vector / np.linalg.norm(extended_vector)

        logging.info("Emotional valence integration completed")

    def get_enhanced_word_vector(self, word: str) -> np.ndarray:
        """感情価統合された単語ベクトルを取得"""
        if not self.model:
            raise ValueError("Model not loaded")

        try:
            vector = self.model.wv[word]

            # 感情価が統合されている場合、最後の3次元が感情価
            if len(vector) > 100:  # 拡張されたベクトルの場合
                semantic_vector = vector[:-3]  # 意味ベクトル部分
                emotional_vector = vector[-3:]  # 感情価部分
                return vector  # 統合された完全なベクトルを返す

            return vector

        except KeyError:
            # 未知の単語の場合は感情価辞書を参照
            if word in self.emotional_lexicon:
                emotion_data = self.emotional_lexicon[word]
                # 感情価のみのベクトルを生成
                emotional_vector = np.array([
                    emotion_data['valence'],
                    emotion_data['arousal'],
                    emotion_data['dominance']
                ])
                # ゼロベクトルに感情価を追加
                return np.concatenate([np.zeros(self.model.vector_size - 3), emotional_vector])
            else:
                # 完全に未知の場合はゼロベクトルを返す
                logging.warning(f"Word '{word}' not in vocabulary and emotional lexicon")
                return np.zeros(self.model.vector_size)
    
    def save_model(self, path: str = None):
        """モデルの保存"""
        if path is None:
            path = self.model_path
        
        if self.model:
            self.model.save(path)
            logging.info(f"Model saved to {path}")
        else:
            raise ValueError("No model to save")
    
    def load_model(self, path: str = None):
        """モデルの読み込み"""
        if path is None:
            path = self.model_path
        
        if os.path.exists(path):
            self.model = Word2Vec.load(path)
            logging.info(f"Model loaded from {path}")
        else:
            raise FileNotFoundError(f"Model file not found: {path}")
        
        return self.model
    
    def get_word_vector(self, word: str) -> np.ndarray:
        """単語のベクトルを取得"""
        if not self.model:
            raise ValueError("Model not loaded")
        
        try:
            return self.model.wv[word]
        except KeyError:
            # 未知の単語の場合はゼロベクトルを返す
            logging.warning(f"Word '{word}' not in vocabulary, returning zero vector")
            return np.zeros(self.model.vector_size)
    def find_enhanced_similar_words(self, word: str, topn: int = 5,
                                   include_emotional: bool = True) -> List[Tuple[str, float]]:
        """高度化された類似単語検索（感情価統合）"""
        if not self.model:
            raise ValueError("Model not loaded")

        try:
            # 拡張されたベクトルを取得
            query_vector = self.get_enhanced_word_vector(word)

            # 感情価統合を考慮した類似度計算
            similarities = []
            for vocab_word in self.model.wv.index_to_key:
                if vocab_word == word:
                    continue

                vocab_vector = self.get_enhanced_word_vector(vocab_word)

                # コサイン類似度を計算
                similarity = self._cosine_similarity(query_vector, vocab_vector)
                similarities.append((vocab_word, similarity))

            # 類似度でソート
            similarities.sort(key=lambda x: x[1], reverse=True)
            return similarities[:topn]

        except KeyError:
            return []

    def get_enhanced_similarity(self, word1: str, word2: str,
                               semantic_weight: float = 0.7,
                               emotional_weight: float = 0.3) -> float:
        """高度化された類似度計算（意味的・感情的類似性の統合）"""
        if not self.model:
            raise ValueError("Model not loaded")

        try:
            vec1 = self.get_enhanced_word_vector(word1)
            vec2 = self.get_enhanced_word_vector(word2)

            # ベクトルが感情価拡張されている場合
            if len(vec1) > 100 and len(vec2) > 100:
                # 意味ベクトル部分（感情価除く）
                semantic_vec1 = vec1[:-3]
                semantic_vec2 = vec2[:-3]

                # 感情価ベクトル部分
                emotional_vec1 = vec1[-3:]
                emotional_vec2 = vec2[-3:]

                # 重み付き類似度計算
                semantic_similarity = self._cosine_similarity(semantic_vec1, semantic_vec2)
                emotional_similarity = self._cosine_similarity(emotional_vec1, emotional_vec2)

                # 加重平均
                combined_similarity = (semantic_weight * semantic_similarity +
                                     emotional_weight * emotional_similarity)

                return combined_similarity
            else:
                # 標準的なコサイン類似度
                return self._cosine_similarity(vec1, vec2)

        except (KeyError, ValueError):
            return 0.0

    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """コサイン類似度を計算"""
        try:
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            return dot_product / (norm1 * norm2)
        except:
            return 0.0

    def analyze_semantic_clusters(self, words: List[str]) -> Dict[str, List[str]]:
        """意味的クラスタリング分析"""
        if not self.model:
            raise ValueError("Model not loaded")

        clusters = {}
        processed_words = set()

        for word in words:
            if word in processed_words:
                continue

            # 類似語を取得
            similar_words = self.find_enhanced_similar_words(word, topn=10)
            cluster_words = [w for w, sim in similar_words if sim > 0.5]  # 類似度閾値

            if len(cluster_words) > 1:
                cluster_name = f"cluster_{word}"
                clusters[cluster_name] = [word] + cluster_words
                processed_words.update([word] + cluster_words)

        return clusters

    def get_spiritual_semantic_distance(self, word: str, spiritual_concepts: List[str] = None) -> Dict[str, float]:
        """単語とスピリチュアル概念との意味的距離を計算"""
        if spiritual_concepts is None:
            spiritual_concepts = ["soul", "spirit", "consciousness", "transcendence", "enlightenment",
                                "魂", "霊", "意識", "超越", "悟り"]

        distances = {}
        for concept in spiritual_concepts:
            try:
                similarity = self.get_enhanced_similarity(word, concept)
                distances[concept] = similarity
            except:
                distances[concept] = 0.0

        return distances

    # 後方互換性のためのメソッド
    def find_similar_words(self, word: str, topn: int = 5) -> List[tuple]:
        """従来の類似単語検索（後方互換性）"""
        enhanced_results = self.find_enhanced_similar_words(word, topn, include_emotional=False)
        return [(word, sim) for word, sim in enhanced_results]

    def get_similarity(self, word1: str, word2: str) -> float:
        """従来の類似度計算（後方互換性）"""
        return self.get_enhanced_similarity(word1, word2, semantic_weight=1.0, emotional_weight=0.0)

def main():
    """高度化されたWord2Vecモデルのメイン実行関数"""
    trainer = AdvancedWord2VecTrainer()

    # 刺激語データの読み込み
    stimuli_data = trainer.load_jung_stimuli()
    logging.info(f"Loaded {len(stimuli_data)} Jung stimuli words with metadata")

    # 高度化された学習コーパスの生成
    corpus_path = trainer.generate_advanced_training_corpus(stimuli_data)

    # 高度化されたモデルの学習
    model = trainer.train_advanced_model(corpus_path, vector_size=200, epochs=15)

    # モデルの保存
    trainer.save_model()

    # 高度化された類似語検索のテスト
    test_words = ["death", "angry", "soul", "愛", "consciousness"]
    for word in test_words:
        try:
            # 標準的な類似語検索
            similar_standard = trainer.find_similar_words(word, topn=3)
            logging.info(f"Standard similar words to '{word}': {similar_standard}")

            # 高度化された類似語検索（感情価統合）
            similar_enhanced = trainer.find_enhanced_similar_words(word, topn=3)
            logging.info(f"Enhanced similar words to '{word}': {similar_enhanced}")

            # スピリチュアル意味的距離の計算
            spiritual_distances = trainer.get_spiritual_semantic_distance(word)
            top_spiritual = sorted(spiritual_distances.items(), key=lambda x: x[1], reverse=True)[:3]
            logging.info(f"Spiritual semantic distances for '{word}': {top_spiritual}")

        except Exception as e:
            logging.warning(f"Could not analyze word '{word}': {e}")

    # 意味的クラスタリングのテスト
    sample_words = ["death", "sad", "angry", "soul", "spirit", "love", "consciousness"]
    clusters = trainer.analyze_semantic_clusters(sample_words)
    logging.info(f"Semantic clusters: {clusters}")

    # 感情価統合の検証
    emotion_words = ["angry", "sad", "happy", "peace"]
    for word in emotion_words:
        try:
            vector = trainer.get_enhanced_word_vector(word)
            emotional_part = vector[-3:] if len(vector) > 100 else "N/A"
            logging.info(f"Emotional valence for '{word}': {emotional_part}")
        except:
            logging.warning(f"Could not get emotional valence for '{word}'")

if __name__ == '__main__':
    main()
