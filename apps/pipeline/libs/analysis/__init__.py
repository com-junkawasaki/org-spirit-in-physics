"""
Analysis algorithms library for Spirit in Physics Pipeline.

This library contains analysis models, processors, and feature extractors.
"""

from .kawasaki_model import KawasakiModel
from .physiological_processor import PhysiologicalProcessor
from .emotion_processor import EmotionProcessor
from .feature_extractor import FeatureExtractor
from .hume_data_processor import HumeDataProcessor
from .hume_ai_simulator import HumeAISimulator
from .word2vec_trainer import Word2VecTrainer

__all__ = [
    "KawasakiModel",
    "PhysiologicalProcessor",
    "EmotionProcessor",
    "FeatureExtractor",
    "HumeDataProcessor",
    "HumeAISimulator",
    "Word2VecTrainer"
]
