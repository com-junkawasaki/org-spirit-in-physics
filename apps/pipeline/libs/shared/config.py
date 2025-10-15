"""
Configuration management for Spirit in Physics Pipeline services.

This module provides centralized configuration management for all services.
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class DatabaseConfig:
    """Database configuration."""
    host: str
    port: int
    user: str
    password: str
    database: str

    @classmethod
    def from_env(cls, prefix: str = "NEO4J") -> "DatabaseConfig":
        return cls(
            host=os.getenv(f"{prefix}_HOST", "neo4j"),
            port=int(os.getenv(f"{prefix}_PORT", "7687")),
            user=os.getenv(f"{prefix}_USER", "neo4j"),
            password=os.getenv(f"{prefix}_PASSWORD", "neo4jpassword"),
            database=os.getenv(f"{prefix}_DATABASE", "neo4j")
        )


@dataclass
class HumeAIConfig:
    """Hume AI configuration."""
    api_key: str
    api_url: str = "https://api.hume.ai"

    @classmethod
    def from_env(cls) -> "HumeAIConfig":
        return cls(
            api_key=os.getenv("HUME_API_KEY", ""),
            api_url=os.getenv("HUME_API_URL", "https://api.hume.ai")
        )


@dataclass
class ServiceConfig:
    """Service configuration."""
    name: str
    version: str
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    @classmethod
    def from_env(cls, name: str, default_port: int = 8000) -> "ServiceConfig":
        return cls(
            name=name,
            version=os.getenv("SERVICE_VERSION", "1.0.0"),
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", str(default_port))),
            debug=os.getenv("DEBUG", "false").lower() == "true"
        )


@dataclass
class AppConfig:
    """Application configuration."""
    database: DatabaseConfig
    hume_ai: HumeAIConfig
    services: Dict[str, ServiceConfig]

    @classmethod
    def load(cls) -> "AppConfig":
        """Load configuration from environment variables."""
        return cls(
            database=DatabaseConfig.from_env(),
            hume_ai=HumeAIConfig.from_env(),
            services={
                "data_ingestion": ServiceConfig.from_env("data-ingestion", 8001),
                "analysis_engine": ServiceConfig.from_env("analysis-engine", 8002),
                "workflow_orchestrator": ServiceConfig.from_env("workflow-orchestrator", 8003),
                "api_gateway": ServiceConfig.from_env("api-gateway", 8000),
                "storage_adapter": ServiceConfig.from_env("storage-adapter", 8004),
            }
        )


# Global configuration instance
config = AppConfig.load()
