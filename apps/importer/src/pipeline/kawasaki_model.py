import numpy as np
import logging
import os
from typing import Dict, Any, Optional, List

# Try to import gensim and advanced word2vec trainer, use fallback if not available
try:
    from gensim.models import Word2Vec
    GENSIM_AVAILABLE = True
    try:
        from word2vec_trainer import AdvancedWord2VecTrainer
        ADVANCED_W2V_AVAILABLE = True
        logging.info("Advanced Word2Vec trainer available")
    except ImportError:
        ADVANCED_W2V_AVAILABLE = False
        logging.info("Advanced Word2Vec trainer not available, using basic Word2Vec")
except ImportError:
    logging.warning("Gensim not available, using fallback word vector generation")
    GENSIM_AVAILABLE = False
    ADVANCED_W2V_AVAILABLE = False

class KawasakiModel:
    def __init__(self, params, w2v_config):
        self.params = params
        self.w2v_model = None
        self.advanced_trainer = None
        self.use_advanced_w2v = w2v_config.get('use_advanced', False)
        self._load_word2vec_model(w2v_config.get('model_path'))
        logging.info("KawasakiModel initialized.")

    def _load_word2vec_model(self, model_path: Optional[str]):
        """Word2Vecモデルの読み込み（高度化版対応）"""
        if not GENSIM_AVAILABLE:
            logging.info("Gensim not available, using fallback word vectors")
            self.w2v_model = None
            self.advanced_trainer = None
            return

        # 高度化されたWord2Vecを使用する場合
        if self.use_advanced_w2v and ADVANCED_W2V_AVAILABLE:
            try:
                self.advanced_trainer = AdvancedWord2VecTrainer()
                if model_path and os.path.exists(model_path):
                    self.advanced_trainer.load_model(model_path)
                    logging.info(f"Advanced Word2Vec model loaded from {model_path}")
                else:
                    logging.warning("Advanced Word2Vec model path not provided, will use basic functionality")
            except Exception as e:
                logging.error(f"Failed to load advanced Word2Vec model: {e}")
                self.advanced_trainer = None
        # 基本的なWord2Vecを使用する場合
        elif model_path and os.path.exists(model_path):
            try:
                self.w2v_model = Word2Vec.load(model_path)
                logging.info(f"Basic Word2Vec model loaded from {model_path}")
            except Exception as e:
                logging.error(f"Failed to load basic Word2Vec model: {e}")
                self.w2v_model = None
        else:
            logging.warning("Word2Vec model path not provided or file not found")

    def get_word_vector(self, word: str) -> np.ndarray:
        """単語のベクトルを取得（高度化版対応）"""
        # 高度化されたWord2Vecトレーナーが利用可能な場合
        if self.advanced_trainer:
            try:
                return self.advanced_trainer.get_enhanced_word_vector(word)
            except Exception as e:
                logging.warning(f"Failed to get enhanced vector for '{word}': {e}")

        # 基本的なWord2Vecモデルが利用可能な場合
        if self.w2v_model:
            try:
                return self.w2v_model.wv[word]
            except KeyError:
                logging.warning(f"Word '{word}' not in vocabulary, using random vector")

        # どちらも利用できない場合はランダムベクトルを使用
        np.random.seed(hash(word) % 2**32)  # 単語に基づく決定論的なシード
        return np.random.normal(0, 0.1, 200)  # 高度化モデルに合わせた次元数

    def calculate_reaction_component(self, reaction_time_ms: int) -> float:
        """反応時間成分 r(w_I, w_O) の計算"""
        reaction_time_sec = reaction_time_ms / 1000.0
        r = 1 / (reaction_time_sec + self.params['epsilon'])
        return r ** self.params['alpha']

    def calculate_skin_potential_component(self, delta_sp: float) -> float:
        """皮膚電位成分 ΔSP(w_I, w_O) の計算"""
        return np.exp(self.params['gamma'] * delta_sp / self.params['lambda'])

    def calculate_emotion_component(self, emotion_features: Dict[str, Any]) -> float:
        """感情成分 F(w_I, w_O) の計算"""
        # 感情データの統合スコアを計算
        if not emotion_features:
            return 1.0  # 中立的感情

        # 主要な感情の強度を統合（例: 喜び - 悲しみ + 興奮）
        joy = emotion_features.get('joy', 0)
        sadness = emotion_features.get('sadness', 0)
        anger = emotion_features.get('anger', 0)
        fear = emotion_features.get('fear', 0)
        surprise = emotion_features.get('surprise', 0)

        # 感情の統合指標（ポジティブ vs ネガティブ）
        emotional_valence = (joy + surprise) - (sadness + anger + fear)
        
        # 感情の強度
        emotional_intensity = abs(emotional_valence)
        
        return np.exp(self.params['eta'] * emotional_intensity)

    def calculate(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        完全な川崎モデルによる P(w_O | w_I) の計算
        数式: P(w_O | w_I) ∝ exp(vec(w_I)·vec(w_O)) × r(w_I,w_O)^α × exp(γΔSP(w_I,w_O)/λ) × exp(ηF(w_I,w_O))
        """
        stimulus_word = features.get('stimulus_word', '')
        response_word = features.get('response_word', '')
        
        logging.info(f"Calculating spirit vector for: '{stimulus_word}' -> '{response_word}'")

        # --- 各成分の計算 ---
        
        # 1. Word2Vec成分
        vec_i = self.get_word_vector(stimulus_word)
        vec_o = self.get_word_vector(response_word)
        word2vec_comp = np.dot(vec_i, vec_o)
        
        # 2. 反応時間成分
        reaction_time_ms = features.get('reaction_time_ms', 1000)
        reaction_comp = self.calculate_reaction_component(reaction_time_ms)
        
        # 3. 皮膚電位成分
        physiological = features.get('physiological_features', {})
        delta_sp = physiological.get('delta_sp', 0.0)
        sp_comp = self.calculate_skin_potential_component(delta_sp)
        
        # 4. 感情成分
        emotion_data = features.get('emotion_features', {})
        emotion_comp = self.calculate_emotion_component(emotion_data)
        
        # --- 確率の計算 ---
        # 分子: exp(vec(w_I)·vec(w_O)) × r^α × exp(γΔSP/λ) × exp(ηF)
        numerator = np.exp(word2vec_comp) * reaction_comp * sp_comp * emotion_comp
        
        # 分母: 理論的には全ての可能な応答語w_jについての和
        # 実際には近似として1を使用するか、コーパスからの類似語を考慮
        denominator = self._calculate_normalization_term(stimulus_word, vec_i)
        
        p_value = numerator / denominator if denominator != 0 else numerator

        # 確率を0-1の範囲に正規化（ソフトマックス的アプローチ）
        p_value = 1 / (1 + np.exp(-p_value))  # シグモイド関数

        result = {
            "p_value": float(p_value),
            "components": {
                "word2vec": float(word2vec_comp),
                "reaction_time": float(reaction_comp),
                "skin_potential": float(sp_comp),
                "emotion": float(emotion_comp)
            },
            "raw_inputs": features,
            "normalization_term": float(denominator),
            "model_version": "kawasaki-v1.0",
            "hyperparameters": self.params
        }
        
        logging.info(f"Calculation complete. P-value: {p_value:.6f}")
        logging.info(f"Components: Word2Vec={word2vec_comp:.3f}, Reaction={reaction_comp:.3f}, SP={sp_comp:.3f}, Emotion={emotion_comp:.3f}")
        
        return result

    def _calculate_normalization_term(self, stimulus_word: str, stimulus_vector: np.ndarray) -> float:
        """
        正規化項の計算（分母）
        実際のモデルでは全ての可能な応答語について計算するが、ここでは近似
        """
        if not self.w2v_model or not GENSIM_AVAILABLE:
            return 1.0

        try:
            # 刺激語に最も類似した単語を取得（トップ10）
            similar_words = self.w2v_model.wv.most_similar(stimulus_word, topn=10)

            # 各類似語について分子を計算し、総和
            total = 0.0
            for similar_word, similarity in similar_words:
                similar_vector = self.get_word_vector(similar_word)
                word2vec_comp = np.dot(stimulus_vector, similar_vector)

                # 簡易版: Word2Vec成分のみを使用
                total += np.exp(word2vec_comp)

            return total / len(similar_words)  # 平均

        except KeyError:
            # 類似語が見つからない場合は1を返す
            return 1.0

    def get_spirit_vector(self, stimulus_word: str, response_word: str) -> np.ndarray:
        """
        刺激語と応答語からSpiritベクトルを計算
        """
        vec_i = self.get_word_vector(stimulus_word)
        vec_o = self.get_word_vector(response_word)
        
        # ベクトルの差分をSpiritベクトルとして使用
        spirit_vector = vec_o - vec_i
        
        return spirit_vector

    def find_spiritually_similar_words(self, target_word: str, topn: int = 5) -> list:
        """
        霊性的に類似した単語を探す（感情価統合・スピリチュアル文脈を考慮）
        """
        # 高度化されたWord2Vecトレーナーが利用可能な場合
        if self.advanced_trainer:
            try:
                # 感情価統合された類似語検索を使用
                enhanced_similar = self.advanced_trainer.find_enhanced_similar_words(
                    target_word, topn=topn, include_emotional=True
                )
                return [(word, sim) for word, sim in enhanced_similar]
            except Exception as e:
                logging.warning(f"Enhanced similar words search failed: {e}")

        # 基本的なWord2Vecモデルが利用可能な場合
        if self.w2v_model and GENSIM_AVAILABLE:
            try:
                # 通常の意味的類似度に加えて、感情価を考慮
                similar_words = self.w2v_model.wv.most_similar(target_word, topn=topn*2)

                # 感情価の高い単語を優先（簡易版）
                emotionally_weighted = []
                for word, similarity in similar_words:
                    # 単語の感情価を推定（仮定のロジック）
                    emotional_boost = self._estimate_emotional_intensity(word)
                    weighted_similarity = similarity * (1 + emotional_boost)
                    emotionally_weighted.append((word, weighted_similarity))

                # 重み付けされた類似度でソート
                emotionally_weighted.sort(key=lambda x: x[1], reverse=True)

                return emotionally_weighted[:topn]

            except KeyError:
                pass

        return []

    def get_enhanced_semantic_similarity(self, word1: str, word2: str,
                                       semantic_weight: float = 0.7,
                                       emotional_weight: float = 0.3) -> float:
        """
        高度化された意味的類似度を計算（感情価統合）
        """
        if self.advanced_trainer:
            try:
                return self.advanced_trainer.get_enhanced_similarity(
                    word1, word2, semantic_weight, emotional_weight
                )
            except Exception as e:
                logging.warning(f"Enhanced similarity calculation failed: {e}")

        # フォールバック: 基本的なベクトル類似度
        vec1 = self.get_word_vector(word1)
        vec2 = self.get_word_vector(word2)

        # コサイン類似度
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def get_spiritual_semantic_distance(self, word: str) -> Dict[str, float]:
        """
        単語とスピリチュアル概念との意味的距離を計算
        """
        if self.advanced_trainer:
            try:
                return self.advanced_trainer.get_spiritual_semantic_distance(word)
            except Exception as e:
                logging.warning(f"Spiritual distance calculation failed: {e}")

        # フォールバック: 基本的なスピリチュアル距離計算
        spiritual_concepts = ["soul", "spirit", "consciousness", "transcendence", "enlightenment",
                             "愛", "霊", "意識", "超越", "悟り"]

        distances = {}
        for concept in spiritual_concepts:
            try:
                similarity = self.get_enhanced_semantic_similarity(word, concept)
                distances[concept] = similarity
            except:
                distances[concept] = 0.0

        return distances

    def analyze_semantic_clusters(self, words: List[str]) -> Dict[str, List[str]]:
        """
        意味的クラスタリング分析を実行
        """
        if self.advanced_trainer:
            try:
                return self.advanced_trainer.analyze_semantic_clusters(words)
            except Exception as e:
                logging.warning(f"Semantic clustering analysis failed: {e}")

        # フォールバック: 簡易的なクラスタリング
        clusters = {}
        processed_words = set()

        for word in words:
            if word in processed_words:
                continue

            # 類似語を取得（簡易版）
            similar_words = self.find_spiritually_similar_words(word, topn=5)
            cluster_words = [w for w, sim in similar_words if sim > 0.3]  # 類似度閾値

            if len(cluster_words) > 1:
                cluster_name = f"cluster_{word}"
                clusters[cluster_name] = [word] + cluster_words
                processed_words.update([word] + cluster_words)

        return clusters

    def _estimate_emotional_intensity(self, word: str) -> float:
        """単語の感情強度を推定（簡易版）"""
        emotional_words = {
            'death': 0.8, 'angry': 0.7, 'sad': 0.6, 'fear': 0.7, 'joy': 0.6,
            'love': 0.8, 'hate': 0.7, 'pain': 0.6, 'peace': 0.5, 'war': 0.8
        }
        
        # 単語の部分一致で感情強度を推定
        for emotional_word, intensity in emotional_words.items():
            if emotional_word in word.lower():
                return intensity
        
        return 0.0  # 中立的
