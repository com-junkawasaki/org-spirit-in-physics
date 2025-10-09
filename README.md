# Spirit in Physics

A comprehensive research platform integrating scientific analysis, emotion detection, and spiritual measurement using advanced AI technologies.

## Architecture

- **Backend**: Kotlin/Spring Boot with Axon Framework and Temporal
- **Frontend**: Next.js/React applications (Patient, Admin, Visualizer)
- **AI/ML**: Hume AI emotion analysis, Word2Vec semantic processing
- **Database**: PostgreSQL with Supabase integration
- **Contract Testing**: Pact for API compatibility assurance

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Java 21
- Kotlin

### Development Setup

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd spirit-in-physics
   pnpm install
   ```

2. **Start development environment with Pact CDCI**
   ```bash
   pnpm run dev:full
   ```
   This automatically starts all services including Pact Broker and runs contract tests.

3. **Access applications**
   - Patient App: http://localhost:3002
   - Admin Dashboard: http://localhost:3001
   - Visualizer: http://localhost:3003
   - Pact Broker: http://localhost:9292

## Development Workflow

### With Pact Contract Testing (Recommended)

```bash
# Start full environment with automatic Pact testing
pnpm run dev:full

# Run Pact tests manually
pnpm run dev:pact

# Start Pact Broker only
pnpm run pact:broker:start

# Watch mode - automatic testing on file changes
pnpm run test:pact:watch
```

### Traditional Development

```bash
# Start all services
pnpm run dev

# Start backend only
pnpm run dev:backend

# Start frontend only
pnpm run dev:frontend
```

## Available Scripts

### Development
- `pnpm run dev` - Start all services
- `pnpm run dev:full` - Start all services + Pact CDCI
- `pnpm run dev:backend` - Start backend services only
- `pnpm run dev:frontend` - Start frontend services only
- `pnpm run dev:services` - Start infrastructure services

### Pact Contract Testing
- `pnpm run dev:pact` - Run complete Pact CDCI cycle
- `pnpm run test:pact:watch` - Watch files and run tests automatically
- `pnpm run pact:broker:start` - Start Pact Broker
- `pnpm run pact:broker:stop` - Stop Pact Broker
- `pnpm run pact:broker:logs` - View Pact Broker logs
- `pnpm run pact:publish` - Publish contracts to broker

### Maintenance
- `pnpm run clean` - Clean up containers and volumes

## Project Structure

```
spirit-in-physics/
├── apps/
│   ├── backend/          # Kotlin/Spring Boot API
│   ├── patient/          # Patient experiment interface
│   ├── admin/            # Admin dashboard
│   ├── visualizer/       # Data visualization
│   └── analyzer-temporal/# Python temporal workflows
├── docs/
│   └── pact/            # Pact documentation
├── scripts/             # Development scripts
├── docker-compose.yml   # Service orchestration
└── pact.env            # Pact configuration
```

## API Contracts

This project uses **Consumer-Driven Contract Testing** with Pact:

- **Consumer Tests**: Frontend apps define expected API behavior
- **Provider Tests**: Backend verifies contracts are fulfilled
- **Pact Broker**: Central contract storage and verification

### Key APIs
- **Temporal API**: Workflow orchestration (`/api/temporal`)
- **Participant API**: User management (`/api/participants`)
- **Visualizer API**: Data analysis (`/api/visualizer`)

## Research Components

### Kawazaki Model
- Word2Vec semantic analysis
- Reaction time measurement
- Emotion integration
- Spirit probability calculation

### AI Integration
- **Hume AI**: Emotion detection from video/audio
- **Word2Vec**: Semantic vector processing
- **Temporal**: Asynchronous workflow orchestration

### Data Pipeline
1. Participant experiment data collection
2. Hume AI emotion analysis
3. Kawazaki model processing
4. Results visualization and analysis

## Development Guidelines

### Code Quality
- Kotlin for backend (JVM ecosystem)
- TypeScript for frontend (type safety)
- ESLint/Prettier for code formatting
- Gradle for build management

### Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing
- **Contract Tests**: API compatibility (Pact)
- **E2E Tests**: Full user journey testing

### Architecture Principles
- **SOLID**: Object-oriented design principles
- **Hexagonal Architecture**: Dependency inversion
- **CQRS**: Command Query Responsibility Segregation
- **Event Sourcing**: State management via events

## Deployment

### Local Development
```bash
# Full local environment
pnpm run dev:full

# Production-like testing
docker-compose -f docker-compose.yml up
```

### Production
- Docker containerization
- Kubernetes orchestration
- CI/CD with GitHub Actions
- Contract verification in pipeline

## Documentation

- [Pact Contract Testing](./docs/pact/README.md)
- [Local Development with Pact](./docs/pact/LOCAL_DEVELOPMENT.md)
- [API Documentation](./docs/api/)
- [Research Methodology](./docs/research/)

## Contributing

1. Follow the development workflow with Pact testing
2. Ensure contract tests pass before submitting PR
3. Update documentation for API changes
4. Follow conventional commit format

## License

MIT License - see LICENSE file for details

## Research Ethics

This project involves human participants and emotion analysis. All research activities follow ethical guidelines and obtain proper informed consent. Data privacy and participant welfare are paramount considerations.
