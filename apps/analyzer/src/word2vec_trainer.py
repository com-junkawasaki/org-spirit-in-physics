#!/usr/bin/env python3
"""
Word2Vecモデルの学習スクリプト
ユングの単語連合テストの刺激語と関連テキストを使ってモデルを学習
"""

import logging
import os
from gensim.models import Word2Vec
from gensim.models.word2vec import LineSentence
import pandas as pd
import numpy as np
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class Word2VecTrainer:
    def __init__(self):
        self.model = None
        self.model_path = "models/jung_word2vec.model"
        
    def load_jung_stimuli(self) -> List[str]:
        """ユングの単語連合テストの刺激語を読み込み"""
        stimuli_words = [
            "head", "green", "water", "to sing", "death", "long", "ship", "to pay", "window", 
            "friendly", "table", "to ask", "village", "cold", "stem", "to dance", "lake", 
            "sick", "pride", "to cook", "ink", "angry", "needle", "to swim", "journey", 
            "blue", "lamp", "to sin", "bread", "rich", "tree", "to prick", "pity", 
            "yellow", "mountain", "to die", "salt", "new", "custom", "to pray", "money", 
            "stupid", "exercise-book", "to despise", "finger", "dear", "bird", "to fall", 
            "book", "unjust", "frog", "to part", "hunger", "white", "child", "to pay attention", 
            "pencil", "sad", "plum", "to marry", "house", "darling", "glass", "to quarrel", 
            "fur", "big", "carrot", "to paint", "part", "old", "flower", "to beat", 
            "box", "wild", "family", "to wash", "cow", "friend", "happiness", "lie", 
            "deportment", "narrow", "brother", "to fear", "stork", "FALSE", "anxiety", 
            "to kiss", "bride", "pure", "door", "to choose", "hay", "contented", 
            "ridicule", "to sleep", "month", "nice", "woman", "to abuse"
        ]
        return stimuli_words
    
    def generate_training_corpus(self, stimuli_words: List[str]) -> str:
        """刺激語から学習用のコーパスを生成"""
        corpus_path = "data/training_corpus.txt"
        
        # 日本語訳と関連語を追加
        japanese_translations = {
            "head": ["頭", "首", "脳", "髪", "顔", "思考", "知性", "リーダー", "先頭"],
            "green": ["緑", "自然", "生命", "成長", "平和", "環境", "森", "葉"],
            "water": ["水", "液体", "飲み物", "海", "川", "雨", "清潔", "命"],
            "death": ["死", "終わり", "喪失", "別れ", "悲しみ", "永遠", "冥界"],
            "long": ["長い", "時間", "距離", "忍耐", "待つ", "伸ばす", "永遠"],
            "ship": ["船", "航海", "海", "旅行", "冒険", "輸送", "帆"],
            "angry": ["怒り", "怒る", "苛立つ", "イライラ", "憤り", "激怒"],
            "needle": ["針", "鋭い", "痛い", "縫う", "注射", "細い"],
            "pride": ["誇り", "プライド", "自信", "尊厳", "自尊心", "傲慢"],
            "lamp": ["ランプ", "光", "照明", "明かり", "夜", "導く"],
            "bread": ["パン", "食べ物", "小麦", "食事", "栄養", "日常"],
            "rich": ["富", "金持ち", "裕福", "豊か", "成功", "権力"],
            "tree": ["木", "森", "自然", "成長", "根", "葉", "幹"],
            "pity": ["同情", "哀れ", "可哀想", "憐れむ", "慈悲", "共感"],
            "yellow": ["黄色", "太陽", "明るい", "注意", "危険", "エネルギー"],
            "mountain": ["山", "高い", "登る", "自然", "眺望", "挑戦"],
            "salt": ["塩", "味", "海", "保存", "調味料", "必須"],
            "new": ["新しい", "新鮮", "現代", "変化", "始まり", "若さ"],
            "money": ["お金", "富", "通貨", "価値", "経済", "支払い"],
            "stupid": ["愚か", "バカ", "無知", "間抜け", "頭悪い", "馬鹿げた"],
            "finger": ["指", "手", "触れる", "細かい", "操作", "感覚"],
            "dear": ["大切", "愛する", "高価", "親愛なる", "宝物"],
            "bird": ["鳥", "空", "飛ぶ", "自由", "歌", "翼"],
            "book": ["本", "知識", "読む", "学習", "ページ", "物語"],
            "white": ["白", "純粋", "清潔", "平和", "雪", "光"],
            "child": ["子供", "幼い", "成長", "純粋", "未来", "無垢"],
            "pencil": ["鉛筆", "書く", "描く", "学習", "細い", "消せる"],
            "sad": ["悲しい", "悲しみ", "寂しい", "涙", "喪失", "憂鬱"],
            "house": ["家", "住む", "家族", "安全", "居場所", "建物"],
            "big": ["大きい", "巨大", "重要", "成長", "力", "影響"],
            "old": ["古い", "年老いた", "経験", "歴史", "伝統", "思い出"],
            "family": ["家族", "血縁", "絆", "愛", "支え", "団結"],
            "lie": ["嘘", "偽り", "欺く", "真実", "信頼", "嘘つき"],
            "narrow": ["狭い", "細い", "制限", "集中", "視野", "幅"],
            "brother": ["兄弟", "家族", "絆", "ライバル", "支え"],
            "pure": ["純粋", "清潔", "無垢", "純正", "純粋さ", "清らか"],
            "nice": ["良い", "親切", "素敵", "優しい", "心地よい"],
            "woman": ["女性", "女", "母", "妻", "娘", "美"],
        }
        
        with open(corpus_path, 'w', encoding='utf-8') as f:
            for word in stimuli_words:
                # 英語の刺激語
                f.write(f"{word}\n")
                
                # 日本語訳と関連語
                if word in japanese_translations:
                    related_words = japanese_translations[word]
                    # 刺激語と関連語を同じ文脈で学習
                    sentence = f"{word} {' '.join(related_words)}\n"
                    f.write(sentence)
                    
                    # 各関連語も個別に学習
                    for related in related_words:
                        f.write(f"{related}\n")
        
        logging.info(f"Training corpus created at {corpus_path}")
        return corpus_path
    
    def train_model(self, corpus_path: str, vector_size: int = 100, window: int = 5, 
                   min_count: int = 1, workers: int = 4) -> Word2Vec:
        """Word2Vecモデルの学習"""
        logging.info("Starting Word2Vec model training...")
        
        # コーパスから文を読み込み
        sentences = LineSentence(corpus_path)
        
        # モデルを学習
        self.model = Word2Vec(
            sentences,
            vector_size=vector_size,    # ベクトルの次元数
            window=window,              # コンテキストウィンドウサイズ
            min_count=min_count,        # 最低出現回数
            workers=workers,            # 並列処理数
            sg=1,                       # Skip-gramを使用
            epochs=10,                  # エポック数
            seed=42                     # 再現性のためのシード
        )
        
        logging.info(f"Model trained with {len(self.model.wv)} words")
        return self.model
    
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
    
    def find_similar_words(self, word: str, topn: int = 5) -> List[tuple]:
        """類似単語の検索"""
        if not self.model:
            raise ValueError("Model not loaded")
        
        try:
            return self.model.wv.most_similar(word, topn=topn)
        except KeyError:
            return []
    
    def get_similarity(self, word1: str, word2: str) -> float:
        """2つの単語間の類似度を計算"""
        if not self.model:
            raise ValueError("Model not loaded")
        
        try:
            return self.model.wv.similarity(word1, word2)
        except KeyError:
            return 0.0

def main():
    """メイン実行関数"""
    trainer = Word2VecTrainer()
    
    # 刺激語の読み込み
    stimuli_words = trainer.load_jung_stimuli()
    logging.info(f"Loaded {len(stimuli_words)} Jung stimuli words")
    
    # 学習コーパスの生成
    corpus_path = trainer.generate_training_corpus(stimuli_words)
    
    # モデルの学習
    model = trainer.train_model(corpus_path)
    
    # モデルの保存
    trainer.save_model()
    
    # テスト: 類似単語の検索
    test_words = ["death", "angry", "love", "family"]
    for word in test_words:
        if word in stimuli_words or word in ["love"]:  # loveはテスト用
            similar = trainer.find_similar_words(word, topn=3)
            logging.info(f"Words similar to '{word}': {similar}")

if __name__ == '__main__':
    main()
