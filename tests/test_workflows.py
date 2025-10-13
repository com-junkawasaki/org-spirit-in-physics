"""
Tests for Serverless Workflow API endpoints.
"""

import pytest
import asyncio
import aiohttp
from datetime import timedelta


class TestWorkflowAPI:
    """Test suite for workflow API endpoints."""

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_workflow_validation_endpoint(self):
        """Test workflow validation API endpoint."""
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post('http://localhost:8000/api/workflows/validate') as response:
                    assert response.status == 200
                    data = await response.json()
                    assert 'validation_results' in data
                    assert 'summary' in data
            except aiohttp.ClientConnectorError:
                pytest.skip("Workflow API not available")

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_workflow_list_endpoint(self):
        """Test workflow list API endpoint."""
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get('http://localhost:8000/api/workflows/list') as response:
                    assert response.status == 200
                    data = await response.json()
                    assert 'workflows' in data
                    assert 'total_count' in data
                    assert isinstance(data['total_count'], int)
            except aiohttp.ClientConnectorError:
                pytest.skip("Workflow API not available")

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_workflow_visualization_endpoint(self):
        """Test workflow visualization API endpoint."""
        async with aiohttp.ClientSession() as session:
            try:
                # First get available workflows
                async with session.get('http://localhost:8000/api/workflows/list') as response:
                    if response.status == 200:
                        data = await response.json()
                        if data['total_count'] > 0:
                            workflow_id = list(data['workflows'].keys())[0]

                            # Test visualization for first workflow
                            async with session.get(f'http://localhost:8000/api/workflows/{workflow_id}/visualize') as viz_response:
                                assert viz_response.status == 200
                                viz_data = await viz_response.json()
                                assert 'workflow_id' in viz_data
                                assert 'mermaid_code' in viz_data
                                assert viz_data['workflow_id'] == workflow_id
            except aiohttp.ClientConnectorError:
                pytest.skip("Workflow API not available")

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_import_workflow_execution(self):
        """Test import workflow execution via API."""
        async with aiohttp.ClientSession() as session:
            try:
                test_data = {
                    "sessionId": "test-session-123",
                    "participantId": "test-participant-456"
                }

                async with session.post('http://localhost:8000/api/workflows/start-import',
                                      json=test_data) as response:
                    # Should return success or indicate job creation
                    assert response.status in [200, 201, 202]
                    data = await response.json()
                    assert 'status' in data
            except aiohttp.ClientConnectorError:
                pytest.skip("Workflow API not available")

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_analysis_workflow_execution(self):
        """Test analysis workflow execution via API."""
        async with aiohttp.ClientSession() as session:
            try:
                test_data = {
                    "sessionIds": ["test-session-1", "test-session-2"],
                    "modelVersion": "1.0",
                    "experimentType": "unified",
                    "notes": "Test analysis workflow"
                }

                async with session.post('http://localhost:8000/api/workflows/start-analysis',
                                      json=test_data) as response:
                    # Should return success or indicate workflow started
                    assert response.status in [200, 201, 202]
                    data = await response.json()
                    assert 'status' in data
            except aiohttp.ClientConnectorError:
                pytest.skip("Workflow API not available")


class TestWorkflowManager:
    """Test suite for workflow manager functionality."""

    @pytest.mark.workflow
    def test_workflow_manager_initialization(self):
        """Test that workflow manager can be initialized."""
        try:
            from apps.pipeline.src.workflows.workflow_manager import get_workflow_manager
            manager = get_workflow_manager()
            assert manager is not None

            workflows = manager.list_workflows()
            assert isinstance(workflows, list)
            assert len(workflows) > 0
        except ImportError:
            pytest.skip("Workflow manager not available")

    @pytest.mark.workflow
    def test_workflow_validation(self):
        """Test workflow validation functionality."""
        try:
            from apps.pipeline.src.workflows.workflow_manager import get_workflow_manager
            manager = get_workflow_manager()

            workflows = manager.list_workflows()
            for workflow_id in workflows:
                validation_result = manager.validate_workflow(workflow_id)
                assert isinstance(validation_result, bool)
        except ImportError:
            pytest.skip("Workflow manager not available")


class TestWorkflowDefinitions:
    """Test suite for workflow definitions."""

    @pytest.mark.workflow
    def test_workflow_definition_imports(self):
        """Test that workflow definitions can be imported."""
        try:
            from apps.pipeline.src.workflows.workflow_definitions import get_all_workflows, get_workflow_by_id
            workflows = get_all_workflows()
            assert isinstance(workflows, dict)
            assert len(workflows) > 0

            # Test getting a specific workflow
            workflow_id = list(workflows.keys())[0]
            workflow = get_workflow_by_id(workflow_id)
            assert workflow is not None
            assert workflow.id == workflow_id
        except ImportError:
            pytest.skip("Workflow definitions not available")
