"""
Schema definitions for emotion data validation
Merkle DAG: import.service.schemas
"""
from .burst import BurstSchema, BurstEmotionRecord
from .language import LanguageSchema, LanguageEmotionRecord
from .prosody import ProsodySchema, ProsodyEmotionRecord
from .face import FaceSchema, FaceEmotionRecord

__all__ = [
    "BurstSchema",
    "BurstEmotionRecord",
    "LanguageSchema",
    "LanguageEmotionRecord",
    "ProsodySchema",
    "ProsodyEmotionRecord",
    "FaceSchema",
    "FaceEmotionRecord",
]

