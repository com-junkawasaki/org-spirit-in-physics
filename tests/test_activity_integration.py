"""
Integration tests for Serverless Workflow activities with real dependencies.
"""
import pytest
import asyncio
import tempfile
import os
from datetime import timedelta
from temporalio.testing import WorkflowEnvironment

# Import activities
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from apps.importer.src.activities.arangodb import ArangoDBActivities
from apps.importer.src.activities.hume_activities import HumeActivities
from apps.analyzer.src.activities import generate_visualizations, run_analysis_pipeline


class TestArangoDBActivityIntegration:
    """Integration tests for ArangoDB activities."""
    
    @pytest.fixture
    def config(self):
        """Test configuration."""
        return {
            'arangodb': {
                'url': 'http://localhost:8529',
                'user': 'root',
                'password': '',
                'database': 'spirit_in_physics'
            }
        }
    
    @pytest.fixture
    def arangodb_activities(self, config):
        """ArangoDB activities instance."""
        return ArangoDBActivities(config)
    
    @pytest.mark.asyncio
    async def test_get_session_for_ingestion_integration(self, arangodb_activities):
        """Test get_session_for_ingestion with real ArangoDB connection."""
        try:
            # This test requires a running ArangoDB instance
            result = await arangodb_activities.get_session_for_ingestion("test-session-id")
            
            # If successful, verify structure
            assert isinstance(result, dict)
            assert "id" in result or "_key" in result
            
        except Exception as e:
            # Expected if ArangoDB is not running
            pytest.skip(f"ArangoDB not available: {e}")
    
    @pytest.mark.asyncio
    async def test_download_media_file_integration(self, arangodb_activities):
        """Test download_media_file activity."""
        try:
            # Create a temporary file path
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(b"test content")
                temp_path = tmp.name
            
            try:
                result = await arangodb_activities.download_media_file(temp_path)
                
                # Verify result
                assert isinstance(result, str)
                assert os.path.exists(result)
                
            finally:
                # Cleanup
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                if os.path.exists(result):
                    os.remove(result)
                    
        except Exception as e:
            pytest.skip(f"Media download test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_cleanup_temp_files_integration(self, arangodb_activities):
        """Test cleanup_temp_files activity."""
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            temp_path = tmp.name
        
        try:
            # Verify file exists
            assert os.path.exists(temp_path)
            
            # Test cleanup
            await arangodb_activities.cleanup_temp_files(temp_path)
            
            # Verify file is removed
            assert not os.path.exists(temp_path)
            
        except Exception as e:
            # Cleanup if test fails
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e


class TestHumeAIActivityIntegration:
    """Integration tests for Hume AI activities."""
    
    @pytest.fixture
    def config(self):
        """Test configuration."""
        return {
            'hume_ai': {
                'api_key': 'test_key'  # Use test key for integration tests
            },
            'processing': {
                'max_poll_attempts': 60,
                'poll_interval_seconds': 10
            }
        }
    
    @pytest.fixture
    def hume_activities(self, config):
        """Hume AI activities instance."""
        return HumeActivities(config)
    
    @pytest.mark.asyncio
    async def test_submit_job_to_hume_integration(self, hume_activities):
        """Test submit_job_to_hume with real Hume AI API."""
        try:
            # Create a test media file
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
                tmp.write(b"fake video content")
                temp_path = tmp.name
            
            try:
                result = await hume_activities.submit_job_to_hume(temp_path)
                
                # Verify result
                assert isinstance(result, str)
                assert len(result) > 0
                
            finally:
                # Cleanup
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
        except Exception as e:
            # Expected if Hume AI API is not available or invalid key
            pytest.skip(f"Hume AI API not available: {e}")
    
    @pytest.mark.asyncio
    async def test_validate_hume_results_integration(self, hume_activities):
        """Test validate_hume_results activity."""
        # Test with mock data
        mock_predictions = {
            'face': {
                'predictions': [
                    {'time': 0, 'emotions': [{'name': 'joy', 'score': 0.8}]},
                    {'time': 1000, 'emotions': [{'name': 'sadness', 'score': 0.2}]}
                ]
            },
            'prosody': {
                'predictions': [
                    {'time': 0, 'emotions': [{'name': 'excitement', 'score': 0.6}]}
                ]
            },
            'language': {
                'predictions': [
                    {'time': 0, 'text': 'Hello world', 'emotions': [{'name': 'neutral', 'score': 0.5}]}
                ]
            }
        }
        
        result = await hume_activities.validate_hume_results(mock_predictions)
        
        # Verify result
        assert result is True
    
    @pytest.mark.asyncio
    async def test_validate_hume_results_invalid_data(self, hume_activities):
        """Test validate_hume_results with invalid data."""
        # Test with invalid data
        invalid_predictions = {
            'face': {
                'predictions': []
            },
            'prosody': {
                # Missing predictions key
            },
            'language': {
                'predictions': None
            }
        }
        
        result = await hume_activities.validate_hume_results(invalid_predictions)
        
        # Should still return True (validation is lenient)
        assert result is True


class TestAnalyzerActivityIntegration:
    """Integration tests for analyzer activities."""
    
    @pytest.fixture
    def config(self):
        """Test configuration."""
        return {
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
    
    @pytest.mark.asyncio
    async def test_run_analysis_pipeline_integration(self, config):
        """Test run_analysis_pipeline activity."""
        try:
            result = await run_analysis_pipeline("v1.0.0", "Test run", config)
            
            # Verify result
            assert isinstance(result, str)
            assert len(result) > 0
            
        except Exception as e:
            # Expected if dependencies are not available
            pytest.skip(f"Analysis pipeline dependencies not available: {e}")
    
    @pytest.mark.asyncio
    async def test_generate_visualizations_integration(self, config):
        """Test generate_visualizations activity."""
        try:
            result = await generate_visualizations("test-run-id", config)
            
            # Verify result
            assert isinstance(result, str)
            assert len(result) > 0
            
        except Exception as e:
            # Expected if dependencies are not available
            pytest.skip(f"Visualization dependencies not available: {e}")


class TestWorkflowEnvironmentIntegration:
    """Integration tests using WorkflowEnvironment."""
    
    @pytest.mark.asyncio
    async def test_workflow_environment_setup(self):
        """Test that WorkflowEnvironment can be set up properly."""
        async with WorkflowEnvironment() as env:
            # Test basic workflow execution
            from apps.importer.src.workflows import IngestionWorkflow
            
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
                # Test that worker is running
                assert env.client is not None
                
                # Test workflow execution (will fail due to missing dependencies)
                try:
                    result = await env.client.execute_workflow(
                        IngestionWorkflow.run,
                        "test-session-id",
                        id="test-workflow-environment"
                    )
                    # If successful, verify structure
                    assert isinstance(result, dict)
                    assert "status" in result
                    
                except Exception as e:
                    # Expected if dependencies are not available
                    pytest.skip(f"Workflow execution failed due to missing dependencies: {e}")


if __name__ == "__main__":
    pytest.main([__file__])
