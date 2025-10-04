import numpy as np
import logging
import os
from gensim.models import Word2Vec
from typing import Dict, Any, Optional

class KawasakiModel:
    def __init__(self, params, w2v_config):
        self.params = params
        self.w2v_model = None
        self._load_word2vec_model(w2v_config.get('model_path'))
        logging.info("KawasakiModel initialized.")

    def _load_word2vec_model(self, model_path: Optional[str]):
        """Word2Vecモデルの読み込み"""
        if model_path and os.path.exists(model_path):
            try:
                self.w2v_model = Word2Vec.load(model_path)
                logging.info(f"Word2Vec model loaded from {model_path}")
            except Exception as e:
                logging.error(f"Failed to load Word2Vec model: {e}")
                self.w2v_model = None
        else:
            logging.warning("Word2Vec model path not provided or file not found")

    def get_word_vector(self, word: str) -> np.ndarray:
        """単語のベクトルを取得"""
        if self.w2v_model:
            try:
                return self.w2v_model.wv[word]
            except KeyError:
                logging.warning(f"Word '{word}' not in vocabulary, using random vector")
        
        # Word2Vecモデルがない場合はランダムベクトルを使用
        np.random.seed(hash(word) % 2**32)  # 単語に基づく決定論的なシード
        return np.random.normal(0, 0.1, 100)  # 平均0、標準偏差0.1の正規分布

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
        if not self.w2v_model:
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
        霊性的に類似した単語を探す（感情的・生理的文脈を考慮）
        """
        if not self.w2v_model:
            return []
        
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
            return []

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
