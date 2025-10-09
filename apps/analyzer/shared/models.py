"""
Shared data models for Temporal workflows and activities.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class Config(BaseModel):
    """Configuration model."""
    temporal: Dict[str, Any]
    supabase: Dict[str, str]
    hume_ai: Dict[str, str]
    model_params: Dict[str, float]
    word2vec: Dict[str, Any]
    processing: Dict[str, Any]
    output: Dict[str, str]
    analysis: Optional[Dict[str, Any]] = None


class EmotionData(BaseModel):
    """Emotion data point from Hume AI."""
    timestamp_offset_ms: int
    source: str
    emotion_data: Dict[str, float]


class HumeDataSummary(BaseModel):
    """Summary of Hume AI data processing."""
    face_data_points: int
    prosody_data_points: int
    language_data_points: int
    total_emotion_points: int
    burst_events: int


class EmotionStatistics(BaseModel):
    """Statistics for emotion data."""
    count: int
    duration_seconds: float
    top_emotions: Dict[str, float]
    dominant_emotion: Optional[str]


class EmotionAnalysisResult(BaseModel):
    """Result of emotion analysis."""
    hume_data_summary: HumeDataSummary
    emotion_statistics: Dict[str, EmotionStatistics]
    emotion_timeseries: List[EmotionData]
    average_emotions: Dict[str, float]


class MockResponseData(BaseModel):
    """Mock response data for Kawasaki analysis."""
    id: str
    participant_id: str
    experiment_id: str
    word_stimulus_id: int
    stimulus_word: str
    response_word: str
    reaction_time_ms: int
    session: str
    timestamp: str
    audio_file_path: Optional[str]
    video_file_path: Optional[str]
    skin_potential: float
    emotion: str
    emotion_confidence: float


class KawasakiAnalysisResult(BaseModel):
    """Result of individual Kawasaki analysis."""
    p_value: float
    spirit_probability: float
    confidence_interval: List[float]
    stimulus_word: str
    response_word: str
    analysis_type: str
    emotion_data_points: int


class OverallStatistics(BaseModel):
    """Overall statistics for Kawasaki analysis."""
    total_analyses: int
    avg_spirit_probability: float
    max_spirit_probability: float
    min_spirit_probability: float
    high_spirit_responses: int


class EmotionIntegration(BaseModel):
    """Emotion integration summary."""
    total_emotion_points: int
    emotion_sources: List[str]


class KawasakiResults(BaseModel):
    """Complete Kawasaki analysis results."""
    individual_results: List[KawasakiAnalysisResult]
    overall_statistics: OverallStatistics
    emotion_integration: EmotionIntegration


class AnalysisResults(BaseModel):
    """Complete analysis results."""
    emotion_results: EmotionAnalysisResult
    kawasaki_results: KawasakiResults
    report_content: str
    output_paths: Dict[str, str]
