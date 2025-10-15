"""
Shared data models for Spirit in Physics Pipeline.

This module defines common data structures used across all services.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Any
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


@dataclass
class Job:
    """Job model for tracking pipeline tasks."""
    id: str
    type: JobType
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    data: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class WorkflowExecution:
    """Workflow execution model."""
    id: str
    workflow_id: str
    status: WorkflowStatus
    started_at: datetime
    data: Dict[str, Any]
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class Participant:
    """Participant model."""
    id: str
    name: str
    created_at: datetime
    email: Optional[str] = None
    consent_given: bool = False
    session_count: int = 0


@dataclass
class ExperimentSession:
    """Experiment session model."""
    id: str
    participant_id: str
    started_at: datetime
    data: Dict[str, Any]
    completed_at: Optional[datetime] = None
    status: str = "active"


@dataclass
class AnalysisResult:
    """Analysis result model."""
    id: str
    session_id: str
    participant_id: str
    model_version: str
    spirit_probability: float
    components: Dict[str, float]
    created_at: datetime
    metadata: Dict[str, Any]


@dataclass
class HumeAnalysis:
    """Hume AI analysis result model."""
    id: str
    session_id: str
    participant_id: str
    emotions: Dict[str, float]
    prosody: Dict[str, Any]
    language: Dict[str, Any]
    created_at: datetime


@dataclass
class PhysiologicalData:
    """Physiological data model."""
    id: str
    session_id: str
    participant_id: str
    timestamp: datetime
    skin_conductance: float
    heart_rate: Optional[float] = None
    metadata: Dict[str, Any] = None


@dataclass
class WorkflowDefinition:
    """Workflow definition model."""
    id: str
    name: str
    description: str
    version: str
    definition: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
