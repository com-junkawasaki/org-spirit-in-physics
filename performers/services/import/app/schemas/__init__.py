"""
Schema definitions for emotion data validation
Merkle DAG: import.service.schemas
"""
from .burst import BurstSchema, BurstEmotionRecord, BURST_EMOTION_NAMES
from .language import LanguageSchema, LanguageEmotionRecord, LANGUAGE_EMOTION_NAMES
from .prosody import ProsodySchema, ProsodyEmotionRecord, PROSODY_EMOTION_NAMES
from .face import FaceSchema, FaceEmotionRecord, FACE_EMOTION_NAMES

__all__ = [
    "BurstSchema",
    "BurstEmotionRecord",
    "BURST_EMOTION_NAMES",
    "LanguageSchema",
    "LanguageEmotionRecord",
    "LANGUAGE_EMOTION_NAMES",
    "ProsodySchema",
    "ProsodyEmotionRecord",
    "PROSODY_EMOTION_NAMES",
    "FaceSchema",
    "FaceEmotionRecord",
    "FACE_EMOTION_NAMES",
]

