"""
Pytest configuration and fixtures for Serverless Workflow tests.
"""
import pytest
import asyncio
import tempfile
import os
from datetime import timedelta


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def test_config():
    """Test configuration for workflows and activities."""
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
        },
        'processing': {
            'max_concurrent_jobs': 3,
            'job_timeout_seconds': 600,
            'temp_dir': '/tmp/spirit-analysis',
            'max_poll_attempts': 60,
            'poll_interval_seconds': 10
        },
        'workflows': {
            'api_url': 'http://localhost:8000',
            'task_queue_importer': 'importer-task-queue',
            'task_queue_analyzer': 'analyzer-task-queue'
        }
    }


@pytest.fixture
def workflow_environment():
    """Create a WorkflowEnvironment for testing."""
    return WorkflowEnvironment()


@pytest.fixture
async def mock_hume_predictions():
    """Mock Hume AI predictions for testing."""
    return {
        'face': {
            'predictions': [
                {
                    'time': 0,
                    'emotions': [
                        {'name': 'joy', 'score': 0.8},
                        {'name': 'surprise', 'score': 0.2}
                    ],
                    'face_box': {'x': 100, 'y': 100, 'width': 200, 'height': 200}
                },
                {
                    'time': 1000,
                    'emotions': [
                        {'name': 'sadness', 'score': 0.3},
                        {'name': 'fear', 'score': 0.1}
                    ],
                    'face_box': {'x': 105, 'y': 105, 'width': 195, 'height': 195}
                }
            ]
        },
        'prosody': {
            'predictions': [
                {
                    'time': 0,
                    'emotions': [
                        {'name': 'excitement', 'score': 0.6},
                        {'name': 'calmness', 'score': 0.4}
                    ]
                },
                {
                    'time': 1000,
                    'emotions': [
                        {'name': 'tension', 'score': 0.7},
                        {'name': 'relaxation', 'score': 0.3}
                    ]
                }
            ]
        },
        'language': {
            'predictions': [
                {
                    'time': 0,
                    'text': 'Hello world',
                    'emotions': [
                        {'name': 'neutral', 'score': 0.5},
                        {'name': 'curiosity', 'score': 0.3}
                    ]
                },
                {
                    'time': 1000,
                    'text': 'How are you?',
                    'emotions': [
                        {'name': 'friendliness', 'score': 0.8},
                        {'name': 'concern', 'score': 0.2}
                    ]
                }
            ]
        }
    }


@pytest.fixture
async def mock_session_data():
    """Mock session data for testing."""
    return {
        'id': 'test-session-id',
        'participant_id': 'test-participant-id',
        'storage_path': '/path/to/test-video.mp4',
        'status': 'PENDING',
        'created_at': '2024-01-01T00:00:00Z',
        'video_file_path': '/path/to/test-video.mp4'
    }


@pytest.fixture
def mock_analysis_result():
    """Mock analysis result for testing."""
    return {
        'p_value': 0.9999,
        'components': {
            'word2vec': 0.8,
            'reaction_time': 0.7,
            'skin_potential': 0.6,
            'emotion': 0.9
        },
        'raw_inputs': {
            'response_id': 'test-response-id',
            'features': {
                'word_similarity': 0.8,
                'reaction_time_ms': 1500,
                'skin_potential_mv': -0.092,
                'emotion_score': 0.9
            }
        }
    }


@pytest.fixture
def skip_if_no_arangodb():
    """Skip test if ArangoDB is not available."""
    try:
        from arango import ArangoClient
        client = ArangoClient(hosts='http://localhost:8529')
        client.db('spirit_in_physics', username='root', password='')
        return False  # ArangoDB is available
    except Exception:
        return True  # ArangoDB is not available


@pytest.fixture
def skip_if_no_hume_ai():
    """Skip test if Hume AI API is not available."""
    try:
        from hume import HumeClient
        client = HumeClient('test_key')
        # Try to create a client (this will fail with invalid key, but not with connection issues)
        return False  # Hume AI client can be created
    except Exception:
        return True  # Hume AI is not available


@pytest.fixture
def skip_if_no_workflow_api():
    """Skip test if Workflow API is not available."""
    try:
        import asyncio
        import aiohttp

        async def check_workflow_api():
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post('http://localhost:8000/api/workflows/validate', timeout=aiohttp.ClientTimeout(total=5)) as response:
                        return response.status != 200
            except Exception:
                return True  # API not available

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(check_workflow_api())
        loop.close()
        return result

    except Exception:
        return True  # API not available


# Pytest markers for different test types
pytest.mark.unit = pytest.mark.unit
pytest.mark.integration = pytest.mark.integration
pytest.mark.workflow = pytest.mark.workflow
pytest.mark.activity = pytest.mark.activity
pytest.mark.arangodb = pytest.mark.arangodb
pytest.mark.hume_ai = pytest.mark.hume_ai
pytest.mark.workflow = pytest.mark.workflow
