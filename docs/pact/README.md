# Pact Contract Testing Integration

## Overview

This document describes the Pact contract testing integration for the Spirit in Physics project. Pact enables Consumer-Driven Contract (CDC) testing to ensure API compatibility between microservices and frontend applications.

## Architecture

The project uses a distributed architecture with multiple services:

- **Backend (Provider)**: Kotlin/Spring Boot REST API
- **Frontend Apps (Consumers)**:
  - Patient App (Next.js)
  - Admin Dashboard (Vite/React)
  - Visualizer (Next.js)
- **Pact Broker**: Contract storage and verification

## API Endpoints Covered

### Temporal API (`/api/temporal`)
- `GET /status` - Server status monitoring
- `POST /control` - Server lifecycle management
- `GET /workflows` - Workflow execution listing
- `POST /workflows/execute` - Workflow execution triggering

### Participant API (`/api/participants`)
- `POST /` - Participant creation
- `PUT /{participantId}` - Participant updates
- `POST /{participantId}/consent` - Consent management
- `DELETE /{participantId}` - Participant deactivation
- `GET /{participantId}` - Participant retrieval
- `GET /` - Participant listing
- `GET /count/active` - Active participant counting

### Visualizer API (`/api/visualizer`)
- `GET /participants` - Visualization data
- `GET /participants/{participantId}` - Detailed participant data
- `GET /dashboard/stats` - Dashboard statistics
- `GET /participants/{participantId}/correlation` - Correlation analysis
- `GET /participants/{participantId}/timeline` - Timeline data
- `GET /responses/{responseId}/timeseries` - Time series data
- `GET /analysis-results` - Analysis results

## Setup

### 1. Start Pact Broker

```bash
# Start all services including Pact Broker
docker-compose up -d pact-broker

# Verify Pact Broker is running
curl http://localhost:9292/diagnostic/status/heartbeat
```

### 2. Run Consumer Tests

```bash
# Patient app
cd apps/patient
pnpm test:pact

# Admin app
cd apps/admin
npm test

# Visualizer app
cd apps/visualizer
npm test
```

### 3. Run Provider Tests

```bash
cd apps/backend
./gradlew test --tests "*PactProviderTest*"
```

### 4. Publish Contracts

```bash
# From patient app directory
pnpm run test:pact:publish
```

## Local Development Workflow

1. **Consumer Development**:
   - Write Pact consumer tests defining expected API behavior
   - Run consumer tests to generate pact files
   - Publish pacts to Pact Broker

2. **Provider Development**:
   - Pull latest pacts from Pact Broker
   - Implement/update API to satisfy consumer contracts
   - Run provider verification tests
   - Deploy provider when all contracts pass

3. **Contract Verification**:
   - CI/CD pipeline automatically verifies contracts
   - Provider tests run against consumer expectations
   - Breaking changes are caught before deployment

## Test Structure

### Consumer Tests (Frontend)

Located in `apps/{app}/__tests__/pact/`

```typescript
// Example: temporal-api.pact.spec.ts
describe('Temporal API Consumer Contract', () => {
  const provider = new PactV3({
    consumer: 'patient-app',
    provider: 'spirit-backend',
    // ... configuration
  });

  test('should return temporal status', async () => {
    await provider.addInteraction({
      states: [{ description: 'temporal server is running' }],
      uponReceiving: 'a request for temporal status',
      withRequest: { method: 'GET', path: '/api/temporal/status' },
      willRespondWith: {
        status: 200,
        body: {
          server: { running: true, port: 7233 },
          workflows: { total: 5, running: 2 },
          // ... expected response structure
        }
      }
    });

    const status = await temporalApiService.getTemporalStatus();
    expect(status.server.running).toBe(true);
  });
});
```

### Provider Tests (Backend)

Located in `apps/backend/src/test/kotlin/`

```kotlin
// Example: PactProviderTest.kt
@Provider("spirit-backend")
@PactBroker(
    host = "localhost",
    port = "9292",
    authentication = PactBrokerAuth(username = "admin", password = "password")
)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
class PactProviderTest {

    @TestTemplate
    @ExtendWith(PactVerificationSpringProvider::class)
    fun pactVerificationTestTemplate(context: PactVerificationContext) {
        context.verifyInteraction()
    }

    @State("temporal server is running")
    fun temporalServerRunning() {
        // Setup provider state for verification
    }
}
```

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/pact-contract-tests.yml`) handles:

1. **Consumer Tests**: Run Pact tests for all frontend apps
2. **Provider Tests**: Verify backend against published contracts
3. **Contract Publishing**: Publish verified contracts to Pact Broker

### Workflow Stages

1. **Consumer Contract Tests**
   - Matrix build across all frontend apps
   - Generate pact files
   - Upload artifacts

2. **Provider Verification Tests**
   - Download consumer pacts
   - Run provider verification
   - Fail if contracts broken

3. **Contract Publishing** (main branch only)
   - Publish verified contracts
   - Update contract versions

## Best Practices

### Consumer Development

1. **Define Contracts First**: Write consumer tests before implementing API calls
2. **Use Matchers**: Use Pact matchers for flexible contract definitions
3. **Test Edge Cases**: Include error scenarios and edge cases
4. **Version Contracts**: Use semantic versioning for contract changes

### Provider Development

1. **Implement Against Contracts**: Use published pacts as API specifications
2. **State Management**: Properly manage provider states for verification
3. **Backwards Compatibility**: Avoid breaking changes without consumer coordination
4. **Error Handling**: Ensure consistent error response formats

### General Guidelines

1. **Contract as Documentation**: Treat pacts as living API documentation
2. **Regular Verification**: Run contract tests in CI/CD pipeline
3. **Team Communication**: Use Pact Broker for team coordination
4. **Version Management**: Tag contracts with appropriate versions

## Troubleshooting

### Common Issues

1. **Pact Broker Connection**: Ensure Pact Broker is running and accessible
2. **State Setup**: Verify provider states are correctly configured
3. **Contract Mismatches**: Check response formats match consumer expectations
4. **Version Conflicts**: Resolve version conflicts between consumer/provider

### Debug Commands

```bash
# Check Pact Broker status
curl http://localhost:9292/diagnostic/status/heartbeat

# List published pacts
curl -u admin:password http://localhost:9292/pacts

# View specific pact
curl -u admin:password http://localhost:9292/pacts/provider/spirit-backend/consumer/patient-app/latest

# Clear Pact Broker data (development only)
curl -X DELETE -u admin:password http://localhost:9292/admin/pacticipants
```

## Future Enhancements

- **Can-I-Deploy Checks**: Implement deployment verification
- **Contract Testing Reports**: Add detailed reporting and metrics
- **Multi-Environment Support**: Support different environments (dev/staging/prod)
- **Webhook Integration**: Automate contract verification on pact publication

## References

- [Pact Documentation](https://docs.pact.io/)
- [Pact Broker](https://docs.pact.io/pact_broker)
- [Consumer Driven Contracts](https://martinfowler.com/articles/consumerDrivenContracts.html)
