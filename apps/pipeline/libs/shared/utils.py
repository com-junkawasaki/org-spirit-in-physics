"""
Common utilities for Spirit in Physics Pipeline services.

This module provides utility functions used across all services.
"""

import logging
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid


def setup_logging(service_name: str, level: str = "INFO") -> logging.Logger:
    """Setup logging configuration for a service."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format=f'%(asctime)s - {service_name} - %(name)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(service_name)


def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with optional prefix."""
    if prefix:
        return f"{prefix}-{uuid.uuid4().hex[:8]}"
    return uuid.uuid4().hex


def now_utc() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


def serialize_datetime(dt: datetime) -> str:
    """Serialize datetime to ISO format string."""
    return dt.isoformat()


def deserialize_datetime(dt_str: str) -> datetime:
    """Deserialize ISO format string to datetime."""
    return datetime.fromisoformat(dt_str)


def safe_json_loads(data: str) -> Optional[Dict[str, Any]]:
    """Safely parse JSON string."""
    try:
        return json.loads(data)
    except (json.JSONDecodeError, TypeError):
        return None


def safe_json_dumps(data: Any) -> str:
    """Safely serialize data to JSON string."""
    try:
        return json.dumps(data, default=str)
    except (TypeError, ValueError):
        return "{}"


class ServiceError(Exception):
    """Base exception for service errors."""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": self.message,
            "status_code": self.status_code,
            "details": self.details,
            "timestamp": serialize_datetime(now_utc())
        }


class ValidationError(ServiceError):
    """Validation error."""
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message, 400, {"field": field} if field else {})


class NotFoundError(ServiceError):
    """Resource not found error."""
    def __init__(self, resource: str, resource_id: str):
        super().__init__(f"{resource} not found: {resource_id}", 404,
                        {"resource": resource, "resource_id": resource_id})


class DatabaseError(ServiceError):
    """Database operation error."""
    def __init__(self, operation: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(f"Database {operation} failed", 500, details)
