//! Execution context management
//! 
//! Merkle DAG: activities_rust.execution.context
//! OWL: spirit:Process execution context

use std::collections::HashMap;
use crate::models::ActivityData;
use serde_json::Value;

/// Execution context for workflow
#[derive(Debug, Clone)]
pub struct ExecutionContext {
    /// Activity execution results (Merkle DAG node hash -> result)
    pub results: HashMap<String, crate::models::ActivityExecutionResult>,
    /// Global state
    pub global_state: HashMap<String, Value>,
    /// Dependency graph (for topological sort)
    pub dependencies: HashMap<String, Vec<String>>,
}

impl ExecutionContext {
    pub fn new() -> Self {
        Self {
            results: HashMap::new(),
            global_state: HashMap::new(),
            dependencies: HashMap::new(),
        }
    }

    /// Get result from a previous activity
    pub fn get_result(&self, activity_id: &str) -> Option<&crate::models::ActivityExecutionResult> {
        self.results.get(activity_id)
    }

    /// Store result from an activity
    pub fn store_result(&mut self, result: crate::models::ActivityExecutionResult) {
        self.results.insert(result.activity_id.clone(), result);
    }

    /// Add dependency
    pub fn add_dependency(&mut self, activity_id: String, depends_on: Vec<String>) {
        self.dependencies.insert(activity_id, depends_on);
    }

    /// Topological sort for activity execution order
    pub fn topological_sort(&self) -> Vec<String> {
        let mut visited = HashMap::new();
        let mut result = Vec::new();

        for activity_id in self.dependencies.keys() {
            if !visited.contains_key(activity_id) {
                self.dfs(activity_id, &mut visited, &mut result);
            }
        }

        result.reverse();
        result
    }

    fn dfs(&self, node: &str, visited: &mut HashMap<String, bool>, result: &mut Vec<String>) {
        visited.insert(node.to_string(), true);

        if let Some(deps) = self.dependencies.get(node) {
            for dep in deps {
                if !visited.contains_key(dep) {
                    self.dfs(dep, visited, result);
                }
            }
        }

        result.push(node.to_string());
    }
}

impl Default for ExecutionContext {
    fn default() -> Self {
        Self::new()
    }
}

