// __tests__/pact/temporal-api.pact.spec.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { TemporalApiService } from '../../lib/services/temporal-api.service';
import path from 'path';

const { like, eachLike } = MatchersV3;

/**
 * Merkle DAG: temporal_api_pact_consumer_test
 * Temporal API の Pact Consumer テスト
 * バックエンドとの API 契約を定義・検証
 */
describe('Temporal API Consumer Contract', () => {
  const provider = new PactV3({
    consumer: 'patient-app',
    provider: 'spirit-backend',
    port: 1234, // Pact mock server port
    dir: path.resolve(process.cwd(), 'pacts'),
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    logLevel: 'warn',
  });

  // Temporal API service instance
  let temporalApiService: TemporalApiService;

  beforeAll(() => {
    // Setup Pact mock server
    return provider.setup();
  });

  afterAll(() => {
    // Cleanup Pact mock server
    return provider.finalize();
  });

  beforeEach(() => {
    // Reset interactions between tests
    provider.resetStates();

    // Create service instance with Pact mock URL
    temporalApiService = new TemporalApiService('http://localhost:1234/api');
  });

  describe('GET /api/temporal/status', () => {
    test('should return temporal server status when server is running', async () => {
      // Define the expected interaction
      await provider.addInteraction({
        states: [{ description: 'temporal server is running' }],
        uponReceiving: 'a request for temporal status',
        withRequest: {
          method: 'GET',
          path: '/api/temporal/status',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            server: {
              running: like(true),
              port: like(7233),
              uiPort: like(8080),
              postgresPort: like(5432),
            },
            workflows: {
              total: like(5),
              running: like(2),
              completed: like(3),
              failed: like(0),
            },
            workers: {
              total: like(2),
              active: like(2),
              taskQueues: eachLike('emotion-analysis'),
            },
          },
        },
      });

      // Execute the test
      const status = await temporalApiService.getTemporalStatus();

      // Verify the response structure
      expect(status.server.running).toBe(true);
      expect(status.server.port).toBe(7233);
      expect(status.workflows.total).toBe(5);
      expect(status.workers.taskQueues).toContain('emotion-analysis');
    });

    test('should return temporal server status when server is stopped', async () => {
      await provider.addInteraction({
        states: [{ description: 'temporal server is stopped' }],
        uponReceiving: 'a request for temporal status when server is down',
        withRequest: {
          method: 'GET',
          path: '/api/temporal/status',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            server: {
              running: like(false),
              port: like(7233),
              uiPort: like(8080),
              postgresPort: like(5432),
            },
            workflows: {
              total: like(0),
              running: like(0),
              completed: like(0),
              failed: like(0),
            },
            workers: {
              total: like(0),
              active: like(0),
              taskQueues: like([]),
            },
          },
        },
      });

      const status = await temporalApiService.getTemporalStatus();

      expect(status.server.running).toBe(false);
      expect(status.workflows.total).toBe(0);
      expect(status.workers.total).toBe(0);
    });
  });

  describe('GET /api/temporal/workflows', () => {
    test('should return list of workflows when executions exist', async () => {
      await provider.addInteraction({
        states: [{ description: 'workflow executions exist' }],
        uponReceiving: 'a request for workflow list',
        withRequest: {
          method: 'GET',
          path: '/api/temporal/workflows',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: eachLike({
            id: like('workflow-123'),
            name: like('EmotionAnalysisWorkflow'),
            status: like('COMPLETED'),
            startTime: like('2024-01-01T10:00:00Z'),
            endTime: like('2024-01-01T10:05:00Z'),
            taskQueue: like('emotion-analysis'),
          }),
        },
      });

      const workflows = await temporalApiService.getWorkflows();

      expect(workflows).toHaveLength(1);
      expect(workflows[0].id).toBe('workflow-123');
      expect(workflows[0].name).toBe('EmotionAnalysisWorkflow');
      expect(workflows[0].status).toBe('COMPLETED');
      expect(workflows[0].taskQueue).toBe('emotion-analysis');
    });

    test('should return empty list when no workflow executions exist', async () => {
      await provider.addInteraction({
        states: [{ description: 'no workflow executions exist' }],
        uponReceiving: 'a request for workflow list when no executions exist',
        withRequest: {
          method: 'GET',
          path: '/api/temporal/workflows',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: [],
        },
      });

      const workflows = await temporalApiService.getWorkflows();

      expect(workflows).toHaveLength(0);
    });
  });

  describe('POST /api/temporal/control', () => {
    test('should start temporal server successfully', async () => {
      await provider.addInteraction({
        states: [{ description: 'temporal server is stopped' }],
        uponReceiving: 'a request to start temporal server',
        withRequest: {
          method: 'POST',
          path: '/api/temporal/control',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            action: like('start'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: like(true),
            message: like('Temporal server start completed'),
          },
        },
      });

      const result = await temporalApiService.controlTemporalServer('start');

      expect(result.success).toBe(true);
      expect(result.message).toContain('start completed');
    });

    test('should handle temporal server start failure', async () => {
      await provider.addInteraction({
        states: [{ description: 'temporal server start fails' }],
        uponReceiving: 'a request to start temporal server that fails',
        withRequest: {
          method: 'POST',
          path: '/api/temporal/control',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            action: like('start'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: like(false),
            message: like('Failed to start temporal server'),
          },
        },
      });

      const result = await temporalApiService.controlTemporalServer('start');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to start');
    });
  });

  describe('POST /api/temporal/workflows/execute', () => {
    test('should execute workflow successfully', async () => {
      await provider.addInteraction({
        states: [{ description: 'temporal server is running' }],
        uponReceiving: 'a request to execute workflow',
        withRequest: {
          method: 'POST',
          path: '/api/temporal/workflows/execute',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            workflowType: like('EmotionAnalysisWorkflow'),
            params: like({
              participantId: 'participant-123',
              videoFileId: 'video-456',
            }),
            taskQueue: like('emotion-analysis'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: like(true),
            workflowId: like('EmotionAnalysisWorkflow-123456789'),
            message: like('Workflow execution request accepted'),
          },
        },
      });

      const result = await temporalApiService.executeWorkflow({
        workflowType: 'EmotionAnalysisWorkflow',
        params: {
          participantId: 'participant-123',
          videoFileId: 'video-456',
        },
        taskQueue: 'emotion-analysis',
      });

      expect(result.success).toBe(true);
      expect(result.workflowId).toContain('EmotionAnalysisWorkflow');
      expect(result.message).toContain('accepted');
    });
  });
});
