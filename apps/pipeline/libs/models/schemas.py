"""
Pydantic schemas for Spirit in Physics Pipeline data validation.

This module defines Pydantic models for API request/response validation.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobType(str, Enum):
    DATA_INGESTION = "data_ingestion"
    ANALYSIS = "analysis"
    VALIDATION = "validation"
    EXPORT = "export"


class WorkflowStatus(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobCreateRequest(BaseModel):
    """Job creation request."""
    type: JobType
    data: Dict[str, Any] = Field(default_factory=dict)


class JobResponse(BaseModel):
    """Job response."""
    id: str
    type: JobType
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    data: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class WorkflowExecutionCreateRequest(BaseModel):
    """Workflow execution creation request."""
    workflow_id: str
    data: Dict[str, Any] = Field(default_factory=dict)


class WorkflowExecutionResponse(BaseModel):
    """Workflow execution response."""
    id: str
    workflow_id: str
    status: WorkflowStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    data: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ParticipantCreateRequest(BaseModel):
    """Participant creation request."""
    id: str
    name: str
    email: Optional[str] = None


class ParticipantResponse(BaseModel):
    """Participant response."""
    id: str
    name: str
    email: Optional[str] = None
    created_at: datetime
    consent_given: bool = False
    session_count: int = 0


class SessionCreateRequest(BaseModel):
    """Session creation request."""
    participant_id: str
    data: Dict[str, Any] = Field(default_factory=dict)


class SessionResponse(BaseModel):
    """Session response."""
    id: str
    participant_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str = "active"
    data: Dict[str, Any]


class AnalysisResultResponse(BaseModel):
    """Analysis result response."""
    id: str
    session_id: str
    participant_id: str
    model_version: str
    spirit_probability: float
    components: Dict[str, float]
    created_at: datetime
    metadata: Dict[str, Any]


class HumeAnalysisRequest(BaseModel):
    """Hume analysis request."""
    session_id: str
    video_data: Optional[bytes] = None
    audio_data: Optional[bytes] = None


class HumeAnalysisResponse(BaseModel):
    """Hume analysis response."""
    id: str
    session_id: str
    participant_id: str
    emotions: Dict[str, float]
    prosody: Dict[str, Any]
    language: Dict[str, Any]
    created_at: datetime


class PhysiologicalDataRequest(BaseModel):
    """Physiological data request."""
    session_id: str
    participant_id: str
    timestamp: datetime
    skin_conductance: float
    heart_rate: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PhysiologicalDataResponse(BaseModel):
    """Physiological data response."""
    id: str
    session_id: str
    participant_id: str
    timestamp: datetime
    skin_conductance: float
    heart_rate: Optional[float] = None
    metadata: Dict[str, Any]


class WorkflowDefinitionResponse(BaseModel):
    """Workflow definition response."""
    id: str
    name: str
    description: str
    version: str
    definition: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    status_code: int
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str


# Type aliases for backward compatibility
ParticipantSchema = ParticipantResponse
SessionSchema = SessionResponse
AnalysisResultSchema = AnalysisResultResponse
HumeAnalysisSchema = HumeAnalysisResponse
PhysiologicalDataSchema = PhysiologicalDataResponse
JobSchema = JobResponse
WorkflowExecutionSchema = WorkflowExecutionResponse
