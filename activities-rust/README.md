# Spirit in Physics Activities (Rust)

Rust implementation of activities for the Spirit in Physics workflow engine.

## Overview

This crate provides activity implementations based on JSON-LD definitions. Activities are executed through the Execution Engine which supports Merkle DAG-based workflow execution.

## Activities

- **DataCollection**: Collects experimental data from participants
- **DataStorage**: Stores data in Supabase database
- **AnalysisProcess**: Executes Kawasaki Model analysis
- **TimelineIntegration**: Integrates time-series data
- **VisualizationProcess**: Prepares data for 3D Force Timeline visualization

## Usage

### As a Library

```rust
use spirit_activities::*;

let mut engine = ExecutionEngine::new();
engine.register_activity(Box::new(DataCollectionActivity::new()));

let inputs = vec![/* ... */];
let result = engine.execute_activity("activity-id", inputs).await?;
```

### As an HTTP Server

```bash
# Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your-key

# Run server
cargo run --bin activities-server
```

The server exposes a POST endpoint at `/execute`:

```json
{
  "activity_id": "https://spirit-in-physics.gftd.ai/activity/DataCollection",
  "inputs": [...]
}
```

## Architecture

- **Activity Trait**: Common interface for all activities
- **Execution Engine**: Executes activities in topological order (Merkle DAG)
- **Context**: Manages activity execution state and dependencies

## Merkle DAG Support

Activities support Merkle DAG-based workflow execution:
- Dependency tracking
- Topological sort for execution order
- Result caching by activity hash

