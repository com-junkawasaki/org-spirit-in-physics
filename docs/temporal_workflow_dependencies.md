# Serverless Workflow Dependencies

## Overview

This document describes the dependency relationships between Serverless Workflows in the Spirit in Physics project. The system uses a Merkle DAG (Directed Acyclic Graph) approach to manage workflow dependencies and ensure proper execution order.

## Workflow Dependency Graph

```
ingestion → analysis → visualization
```

### Workflow Descriptions

1. **Ingestion Workflow** (`IngestionWorkflow`)
   - **Purpose**: Processes experiment session data through Hume AI analysis
   - **Dependencies**: None (entry point)
   - **Dependents**: Analysis Workflow
   - **Input**: Session ID
   - **Output**: Processed Hume AI data stored in ArangoDB

2. **Analysis Workflow** (`AnalysisWorkflow`)
   - **Purpose**: Runs the Kawasaki model analysis on processed data
   - **Dependencies**: Ingestion Workflow (must complete first)
   - **Dependents**: Visualization Workflow
   - **Input**: Model version, notes, configuration
   - **Output**: Analysis results stored in ArangoDB

3. **Visualization Workflow** (`VisualizationWorkflow`)
   - **Purpose**: Generates visualizations from analysis results
   - **Dependencies**: Analysis Workflow (must complete first)
   - **Dependents**: None (end point)
   - **Input**: Run ID, configuration
   - **Output**: Generated visualization files

## Dependency Management

### WorkflowDependencyManager

The `WorkflowDependencyManager` class manages the dependency graph and ensures proper execution order:

```python
class WorkflowDependencyManager:
    def __init__(self):
        self.dependency_graph = {
            "ingestion": {
                "dependencies": [],
                "dependents": ["analysis"],
                "status": "pending"
            },
            "analysis": {
                "dependencies": ["ingestion"],
                "dependents": ["visualization"],
                "status": "pending"
            },
            "visualization": {
                "dependencies": ["analysis"],
                "dependents": [],
                "status": "pending"
            }
        }
```

### Key Methods

- `get_dependencies(workflow_name)`: Returns list of dependencies
- `get_dependents(workflow_name)`: Returns list of dependents
- `can_execute(workflow_name)`: Checks if all dependencies are completed
- `get_execution_order()`: Returns topological sort of execution order
- `update_status(workflow_name, status)`: Updates workflow status

## Orchestration Patterns

### 1. Sequential Execution

Workflows are executed in dependency order:

```
Ingestion → Analysis → Visualization
```

### 2. Parallel Execution

Multiple instances of the same workflow type can run in parallel:

```
Ingestion-1 ┐
Ingestion-2 ├→ Analysis → Visualization
Ingestion-3 ┘
```

### 3. Pipeline Orchestration

The `PipelineOrchestrator` workflow manages the entire pipeline:

```python
@workflow.defn
class PipelineOrchestrator:
    @workflow.run
    async def run(self, session_ids, model_version, notes, config):
        # Step 1: Execute ingestion workflows in parallel
        ingestion_results = await asyncio.gather(*ingestion_tasks)
        
        # Step 2: Execute analysis workflow
        analysis_result = await workflow.execute_child_workflow(
            "AnalysisWorkflow", model_version, notes, config
        )
        
        # Step 3: Execute visualization workflow
        visualization_result = await workflow.execute_child_workflow(
            "VisualizationWorkflow", run_id, config
        )
```

## Error Handling and Retry Strategies

### Retry Policies

Each workflow type has specific retry policies:

```python
# ArangoDB activities
arangodb_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    maximum_interval=timedelta(minutes=1),
    maximum_attempts=3,
    backoff_coefficient=2.0,
    non_retryable_error_types=["ValueError", "FileNotFoundError"]
)

# Hume AI activities
hume_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=5),
    maximum_interval=timedelta(minutes=5),
    maximum_attempts=5,
    backoff_coefficient=2.0,
    non_retryable_error_types=["FileNotFoundError"]
)
```

### Error Propagation

When a workflow fails:
1. The failure is logged
2. Dependent workflows are notified
3. The dependency graph is updated
4. Error information is returned to the orchestrator

## Implementation Details

### Workflow Registration

Workflows are registered in their respective workers:

```python
# Importer worker
worker = Worker(
    client,
    task_queue="importer-task-queue",
    workflows=[IngestionWorkflow, BatchIngestionWorkflow, PipelineOrchestrator],
    activities=[...]
)

# Analyzer worker
worker = Worker(
    client,
    task_queue="analyzer-task-queue",
    workflows=[AnalysisWorkflow, VisualizationWorkflow, IntegratedAnalysisWorkflow],
    activities=[...]
)
```

### Cross-Workflow Communication

Workflows communicate through:
1. **Child Workflow Execution**: Parent workflows execute child workflows
2. **Search Attributes**: Workflows set search attributes for tracking
3. **Status Updates**: Workflows update their status in the dependency manager
4. **Error Propagation**: Errors are propagated up the dependency chain

## Monitoring and Observability

### Workflow Status Tracking

Each workflow maintains its status:
- `pending`: Waiting for dependencies
- `running`: Currently executing
- `completed`: Successfully completed
- `failed`: Failed with error

### Dependency Monitoring

The `WorkflowStatusMonitor` workflow monitors workflow status and dependencies:

```python
@workflow.defn
class WorkflowStatusMonitor:
    @workflow.run
    async def run(self, workflow_id: str) -> dict:
        # Get workflow status
        handle = workflow.get_external_workflow_handle(workflow_id)
        status = await handle.query("get_status")
        
        # Check dependencies
        dependency_manager = WorkflowDependencyManager()
        can_execute = dependency_manager.can_execute(workflow_id)
        
        return {
            "workflow_id": workflow_id,
            "status": status,
            "can_execute": can_execute,
            "dependencies": dependency_manager.get_dependencies(workflow_id),
            "dependents": dependency_manager.get_dependents(workflow_id)
        }
```

## Best Practices

### 1. Dependency Design
- Keep dependencies minimal and clear
- Avoid circular dependencies
- Use topological sorting for execution order

### 2. Error Handling
- Implement comprehensive error handling
- Use appropriate retry policies
- Propagate errors to dependent workflows

### 3. Monitoring
- Track workflow status and dependencies
- Implement health checks
- Monitor execution metrics

### 4. Testing
- Test dependency relationships
- Test error scenarios
- Test parallel execution

## Future Enhancements

### 1. Dynamic Dependencies
- Support for runtime dependency changes
- Conditional workflow execution
- Dynamic workflow graph modification

### 2. Advanced Orchestration
- Workflow templates
- Conditional branching
- Loop constructs

### 3. Enhanced Monitoring
- Real-time dependency visualization
- Performance metrics
- Alerting and notifications

## Conclusion

The Serverless Workflow SDK dependency system provides a robust foundation for managing complex data processing pipelines. By using Merkle DAG principles and proper orchestration patterns, the system ensures reliable execution order and comprehensive error handling.
