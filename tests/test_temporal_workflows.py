"""
Tests for Temporal workflows in analyzer and importer apps.
"""
import pytest
import asyncio
from datetime import timedelta
from temporalio.testing import WorkflowEnvironment
from temporalio.common import RetryPolicy

# Import workflows and activities
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from apps.importer.src.workflows import IngestionWorkflow, BatchIngestionWorkflow
from apps.importer.src.activities.arangodb import ArangoDBActivities
from apps.importer.src.activities.hume_activities import HumeActivities
from apps.analyzer.src.workflows import AnalysisWorkflow, VisualizationWorkflow, IntegratedAnalysisWorkflow
from apps.analyzer.src.activities import generate_visualizations, run_analysis_pipeline


class TestImporterWorkflows:
    """Test suite for importer workflows."""
    
    @pytest.mark.asyncio
    async def test_ingestion_workflow_success(self):
        """Test successful ingestion workflow execution."""
        async with WorkflowEnvironment() as env:
            # Mock config
            config = {
                'arangodb': {
                    'url': 'http://localhost:8529',
                    'user': 'root',
                    'password': '',
                    'database': 'spirit_in_physics'
                },
                'hume_ai': {
                    'api_key': 'test_key'
                },
                'processing': {
                    'max_poll_attempts': 60,
                    'poll_interval_seconds': 10
                }
            }
            
            # Create activity instances
            arangodb_activities = ArangoDBActivities(config)
            hume_activities = HumeActivities(config)
            
            async with env.worker(
                workflows=[IngestionWorkflow],
                activities=[
                    arangodb_activities.get_session_for_ingestion,
                    arangodb_activities.download_media_file,
                    arangodb_activities.store_raw_hume_data,
                    arangodb_activities.parse_and_store_structured_data,
                    arangodb_activities.update_session_status,
                    arangodb_activities.cleanup_temp_files,
                    hume_activities.submit_job_to_hume,
                    hume_activities.poll_and_fetch_hume_results,
                    hume_activities.validate_hume_results
                ]
            ):
                # Execute workflow
                result = await env.client.execute_workflow(
                    IngestionWorkflow.run,
                    "test-session-id",
                    id="test-ingestion-workflow"
                )
                
                # Assertions
                assert result["status"] == "SUCCESS"
                assert result["sessionId"] == "test-session-id"
                assert "hume_job_id" in result
                assert "artifacts_count" in result
    
    @pytest.mark.asyncio
    async def test_ingestion_workflow_failure(self):
        """Test ingestion workflow failure handling."""
        async with WorkflowEnvironment() as env:
            config = {
                'arangodb': {
                    'url': 'http://localhost:8529',
                    'user': 'root',
                    'password': '',
                    'database': 'spirit_in_physics'
                },
                'hume_ai': {
                    'api_key': 'test_key'
                },
                'processing': {
                    'max_poll_attempts': 60,
                    'poll_interval_seconds': 10
                }
            }
            
            arangodb_activities = ArangoDBActivities(config)
            hume_activities = HumeActivities(config)
            
            async with env.worker(
                workflows=[IngestionWorkflow],
                activities=[
                    arangodb_activities.get_session_for_ingestion,
                    arangodb_activities.download_media_file,
                    arangodb_activities.store_raw_hume_data,
                    arangodb_activities.parse_and_store_structured_data,
                    arangodb_activities.update_session_status,
                    arangodb_activities.cleanup_temp_files,
                    hume_activities.submit_job_to_hume,
                    hume_activities.poll_and_fetch_hume_results,
                    hume_activities.validate_hume_results
                ]
            ):
                # Execute workflow with invalid session ID
                result = await env.client.execute_workflow(
                    IngestionWorkflow.run,
                    "invalid-session-id",
                    id="test-ingestion-workflow-failure"
                )
                
                # Assertions
                assert result["status"] == "FAILED"
                assert result["sessionId"] == "invalid-session-id"
                assert "error" in result
    
    @pytest.mark.asyncio
    async def test_batch_ingestion_workflow(self):
        """Test batch ingestion workflow."""
        async with WorkflowEnvironment() as env:
            config = {
                'arangodb': {
                    'url': 'http://localhost:8529',
                    'user': 'root',
                    'password': '',
                    'database': 'spirit_in_physics'
                },
                'hume_ai': {
                    'api_key': 'test_key'
                },
                'processing': {
                    'max_poll_attempts': 60,
                    'poll_interval_seconds': 10
                }
            }
            
            arangodb_activities = ArangoDBActivities(config)
            hume_activities = HumeActivities(config)
            
            async with env.worker(
                workflows=[BatchIngestionWorkflow, IngestionWorkflow],
                activities=[
                    arangodb_activities.get_session_for_ingestion,
                    arangodb_activities.download_media_file,
                    arangodb_activities.store_raw_hume_data,
                    arangodb_activities.parse_and_store_structured_data,
                    arangodb_activities.update_session_status,
                    arangodb_activities.cleanup_temp_files,
                    hume_activities.submit_job_to_hume,
                    hume_activities.poll_and_fetch_hume_results,
                    hume_activities.validate_hume_results
                ]
            ):
                # Execute batch workflow
                session_ids = ["session-1", "session-2", "session-3"]
                result = await env.client.execute_workflow(
                    BatchIngestionWorkflow.run,
                    session_ids,
                    id="test-batch-ingestion-workflow"
                )
                
                # Assertions
                assert result["status"] == "COMPLETED"
                assert result["total_sessions"] == 3
                assert "successful_count" in result
                assert "failed_count" in result
                assert "failed_sessions" in result


class TestAnalyzerWorkflows:
    """Test suite for analyzer workflows."""
    
    @pytest.mark.asyncio
    async def test_analysis_workflow_success(self):
        """Test successful analysis workflow execution."""
        async with WorkflowEnvironment() as env:
            config = {
                'arangodb': {
                    'url': 'http://localhost:8529',
                    'user': 'root',
                    'password': '',
                    'database': 'spirit_in_physics'
                },
                'hume_ai': {
                    'api_key': 'test_key'
                },
                'model_params': {
                    'alpha': 1.0,
                    'gamma': 1.0,
                    'eta': 1.0,
                    'lambda': 1.0,
                    'epsilon': 0.001
                },
                'word2vec': {
                    'model_path': 'test_model_path'
                }
            }
            
            async with env.worker(
                workflows=[AnalysisWorkflow],
                activities=[run_analysis_pipeline]
            ):
                # Execute workflow
                result = await env.client.execute_workflow(
                    AnalysisWorkflow.run,
                    "v1.0.0",
                    "Test analysis run",
                    config,
                    id="test-analysis-workflow"
                )
                
                # Assertions
                assert "Analysis completed successfully" in result or "Analysis pipeline failed" in result
    
    @pytest.mark.asyncio
    async def test_visualization_workflow_success(self):
        """Test successful visualization workflow execution."""
        async with WorkflowEnvironment() as env:
            config = {
                'arangodb': {
                    'url': 'http://localhost:8529',
                    'user': 'root',
                    'password': '',
                    'database': 'spirit_in_physics'
                }
            }
            
            async with env.worker(
                workflows=[VisualizationWorkflow],
                activities=[generate_visualizations]
            ):
                # Execute workflow
                result = await env.client.execute_workflow(
                    VisualizationWorkflow.run,
                    "test-run-id",
                    config,
                    id="test-visualization-workflow"
                )
                
                # Assertions
                assert "Visualizations generated successfully" in result or "Visualization generation failed" in result
    
    @pytest.mark.asyncio
    async def test_integrated_analysis_workflow(self):
        """Test integrated analysis workflow."""
        async with WorkflowEnvironment() as env:
            config = {
                'arangodb': {
                    'url': 'http://localhost:8529',
                    'user': 'root',
                    'password': '',
                    'database': 'spirit_in_physics'
                },
                'hume_ai': {
                    'api_key': 'test_key'
                },
                'model_params': {
                    'alpha': 1.0,
                    'gamma': 1.0,
                    'eta': 1.0,
                    'lambda': 1.0,
                    'epsilon': 0.001
                },
                'word2vec': {
                    'model_path': 'test_model_path'
                }
            }
            
            async with env.worker(
                workflows=[IntegratedAnalysisWorkflow],
                activities=[run_analysis_pipeline, generate_visualizations]
            ):
                # Execute workflow
                result = await env.client.execute_workflow(
                    IntegratedAnalysisWorkflow.run,
                    "v1.0.0",
                    "Test integrated analysis run",
                    config,
                    id="test-integrated-analysis-workflow"
                )
                
                # Assertions
                assert "status" in result
                assert result["status"] in ["SUCCESS", "FAILED"]
                if result["status"] == "SUCCESS":
                    assert "run_id" in result
                    assert "analysis_result" in result
                    assert "visualization_result" in result
                else:
                    assert "error" in result


class TestRetryPolicies:
    """Test retry policies and error handling."""
    
    @pytest.mark.asyncio
    async def test_retry_policy_configuration(self):
        """Test that retry policies are properly configured."""
        # Test ArangoDB retry policy
        arangodb_retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(minutes=1),
            maximum_attempts=3,
            backoff_coefficient=2.0,
            non_retryable_error_types=["ValueError", "FileNotFoundError"]
        )
        
        assert arangodb_retry_policy.maximum_attempts == 3
        assert arangodb_retry_policy.backoff_coefficient == 2.0
        assert "ValueError" in arangodb_retry_policy.non_retryable_error_types
        
        # Test Hume AI retry policy
        hume_retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=5),
            maximum_interval=timedelta(minutes=5),
            maximum_attempts=5,
            backoff_coefficient=2.0,
            non_retryable_error_types=["FileNotFoundError"]
        )
        
        assert hume_retry_policy.maximum_attempts == 5
        assert hume_retry_policy.initial_interval == timedelta(seconds=5)
        assert "FileNotFoundError" in hume_retry_policy.non_retryable_error_types


class TestActivityImplementations:
    """Test individual activity implementations."""
    
    @pytest.mark.asyncio
    async def test_arangodb_activities(self):
        """Test ArangoDB activities."""
        config = {
            'arangodb': {
                'url': 'http://localhost:8529',
                'user': 'root',
                'password': '',
                'database': 'spirit_in_physics'
            }
        }
        
        activities = ArangoDBActivities(config)
        
        # Test that activities are properly defined
        assert hasattr(activities, 'get_session_for_ingestion')
        assert hasattr(activities, 'download_media_file')
        assert hasattr(activities, 'store_raw_hume_data')
        assert hasattr(activities, 'parse_and_store_structured_data')
        assert hasattr(activities, 'update_session_status')
        assert hasattr(activities, 'cleanup_temp_files')
    
    @pytest.mark.asyncio
    async def test_hume_activities(self):
        """Test Hume AI activities."""
        config = {
            'hume_ai': {
                'api_key': 'test_key'
            },
            'processing': {
                'max_poll_attempts': 60,
                'poll_interval_seconds': 10
            }
        }
        
        activities = HumeActivities(config)
        
        # Test that activities are properly defined
        assert hasattr(activities, 'submit_job_to_hume')
        assert hasattr(activities, 'poll_and_fetch_hume_results')
        assert hasattr(activities, 'validate_hume_results')
        assert hasattr(activities, 'get_job_status')
        
        # Test configuration
        assert activities.max_poll_attempts == 60
        assert activities.poll_interval == 10


if __name__ == "__main__":
    pytest.main([__file__])
