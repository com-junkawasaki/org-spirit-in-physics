"""
Base activity class for Temporal workflows.
"""

import logging
import yaml
from pathlib import Path
from typing import Dict, Any
from shared.models import Config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class BaseActivity:
    """Base class for all analysis activities."""

    def __init__(self):
        self.config = self._load_config()
        self.logger = logging.getLogger(self.__class__.__name__)

    def _load_config(self) -> Config:
        """Load configuration from YAML file."""
        config_path = Path(__file__).parent.parent / "config.yaml"
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = yaml.safe_load(f)
            return Config(**config_data)
        except Exception as e:
            self.logger.warning(f"Could not load config from {config_path}: {e}")
            # Return default config
            return Config(
                temporal={"namespace": "default", "task_queue": "spirit-analysis-queue", "host": "localhost:7233"},
                supabase={"url": "", "service_role_key": ""},
                hume_ai={"api_key": ""},
                model_params={
                    "alpha": 1.0, "gamma": 1.0, "eta": 1.0, "lambda": 1.0, "epsilon": 0.001
                },
                word2vec={"model_path": None},
                processing={
                    "max_concurrent_jobs": 3,
                    "job_timeout_seconds": 600,
                    "temp_dir": "/tmp/spirit-analysis-temporal"
                },
                output={"results_dir": "results", "visualizations_dir": "visualizations"}
            )
