# Pact Local Development Guide

## Overview

This guide explains how to run Pact contract testing as part of your local development workflow (CDCI - Continuous Development/Continuous Integration).

## Quick Start

### 1. Start Pact Broker
```bash
pnpm run pact:broker:start
```

### 2. Run Full Pact CDCI
```bash
pnpm run dev:pact
```

### 3. Start Development with Pact Watching
```bash
pnpm run dev:full
```

## Available Commands

### Development Scripts
```bash
# Start all services (including Pact Broker)
pnpm run dev

# Run Pact contract tests locally
pnpm run dev:pact

# Start full development environment with Pact testing
pnpm run dev:full

# Start only backend services
pnpm run dev:backend

# Start only frontend services
pnpm run dev:frontend

# Start only infrastructure services (includes Pact Broker)
pnpm run dev:services
```

### Pact-Specific Scripts
```bash
# Start Pact Broker only
pnpm run pact:broker:start

# Stop Pact Broker
pnpm run pact:broker:stop

# View Pact Broker logs
pnpm run pact:broker:logs

# Publish contracts (after successful tests)
pnpm run pact:publish

# Run Pact tests in watch mode
pnpm run test:pact:watch

# Clean up all containers and volumes
pnpm run clean
```

## Development Workflow

### Standard Development Flow

1. **Start Environment**
   ```bash
   pnpm run dev:full
   ```
   This starts all services including Pact Broker and runs initial contract tests.

2. **Make Changes**
   - Edit API contracts in consumer tests
   - Update backend API implementations
   - Modify frontend service calls

3. **Automatic Testing**
   - File changes trigger automatic Pact test execution
   - Watch mode monitors changes in:
     - `apps/backend/src/main/kotlin` (Provider)
     - `apps/patient/lib` (Consumer)
     - `apps/patient/__tests__/pact` (Tests)
     - `apps/admin/src` (Consumer)
     - `apps/visualizer/lib` (Consumer)

4. **Verify Contracts**
   - Green checkmark = contracts verified
   - Red error = contract mismatch detected

### Manual Testing

```bash
# Test all contracts
pnpm run dev:pact

# Test specific consumer
cd apps/patient && pnpm test:pact

# Test provider
cd apps/backend && ./gradlew test --tests "*PactProviderTest*"
```

## Docker Compose Services

### With Pact Broker
```bash
# Start everything (recommended for development)
docker-compose up

# Start Pact Broker and dependencies only
pnpm run pact:broker:start

# Start specific services
docker-compose up pact-broker pact-postgres backend patient
```

### Without Pact Broker
```bash
# Start services without Pact (for production-like testing)
docker-compose up postgres axonserver temporal backend patient admin visualizer
```

## Environment Configuration

### Pact Broker Access
- **URL**: http://localhost:9292
- **Username**: admin
- **Password**: password
- **Readonly**: readonly / password

### Environment Variables
Pact configuration is loaded from `pact.env`:
```bash
# View current configuration
cat pact.env

# Override for different environment
cp pact.env pact.staging.env
# Edit pact.staging.env for staging environment
```

## File Watching

### Watched Directories
The Pact watcher monitors changes in:
- Backend API code (`apps/backend/src/main/kotlin`)
- Consumer service code (`apps/patient/lib`, `apps/admin/src`, `apps/visualizer/lib`)
- Pact test definitions (`apps/patient/__tests__/pact`)

### Supported File Types
- `.kt` (Kotlin - Backend)
- `.ts` (TypeScript - Frontend)
- `.tsx` (React components)
- `.js` (JavaScript)
- `.spec.ts` (Test files)

### Debouncing
- Changes trigger tests after 2-second delay
- Multiple rapid changes are batched into single test run

## Troubleshooting

### Pact Broker Issues
```bash
# Check if Pact Broker is running
curl http://localhost:9292/diagnostic/status/heartbeat

# View Pact Broker logs
pnpm run pact:broker:logs

# Restart Pact Broker
pnpm run pact:broker:stop && pnpm run pact:broker:start
```

### Test Failures
```bash
# Run tests with verbose output
cd apps/backend && ./gradlew test --tests "*PactProviderTest*" --info

# Run consumer tests with debug output
cd apps/patient && DEBUG=pact:* pnpm test:pact
```

### Container Issues
```bash
# Clean restart all services
pnpm run clean
pnpm run dev:full

# Check container status
docker-compose ps

# View specific service logs
docker-compose logs pact-broker
docker-compose logs backend
```

## Advanced Usage

### Custom Test Execution
```bash
# Run tests in specific order
pnpm run pact:broker:start
cd apps/patient && pnpm test:pact
cd apps/backend && ./gradlew test --tests "*PactProviderTest*"
pnpm run pact:publish
```

### Integration with IDE
- VS Code: Use "Tasks: Run Task" for Pact commands
- WebStorm: Create run configurations for Pact scripts
- Terminal: Use `pnpm run` autocompletion

### CI/CD Integration
The local setup mirrors GitHub Actions workflow:
```yaml
# .github/workflows/pact-contract-tests.yml
- Consumer tests run first
- Provider tests run against published contracts
- Contracts published on successful verification
```

## Performance Tips

### For Large Codebases
- Use `pnpm run dev:pact` instead of watch mode for manual control
- Run consumer/provider tests separately for faster feedback
- Use `--maxWorkers=50%` in Jest for parallel execution

### Memory Usage
- Pact Broker uses ~200MB RAM
- Provider tests may require additional memory
- Use `docker system prune` regularly to clean up

## Best Practices

1. **Always run Pact tests before committing**
2. **Keep contracts simple and focused**
3. **Test edge cases and error scenarios**
4. **Use semantic versioning for contract changes**
5. **Document breaking changes clearly**

## Support

For issues with Pact integration:
1. Check this documentation
2. Review [Pact Documentation](https://docs.pact.io/)
3. Check GitHub Issues for known problems
4. Create new issue with detailed error logs
