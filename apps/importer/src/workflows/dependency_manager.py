"""
Dependency management for Temporal workflows.
Manages dependencies between importer and analyzer workflows.
"""
from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy
from typing import Dict, List, Optional, Any
import asyncio

# Merkle DAG: dependency_manager -> workflow_dependencies
# This module manages the dependency graph between workflows

class WorkflowDependencyManager:
    """Manages dependencies between workflows using Merkle DAG principles."""
    
    def __init__(self):
        # Merkle DAG: dependency_graph -> workflow_nodes
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
    
    def get_dependencies(self, workflow_name: str) -> List[str]:
        """Get dependencies for a workflow."""
        return self.dependency_graph.get(workflow_name, {}).get("dependencies", [])
    
    def get_dependents(self, workflow_name: str) -> List[str]:
        """Get dependents for a workflow."""
        return self.dependency_graph.get(workflow_name, {}).get("dependents", [])
    
    def update_status(self, workflow_name: str, status: str):
        """Update workflow status."""
        if workflow_name in self.dependency_graph:
            self.dependency_graph[workflow_name]["status"] = status
    
    def can_execute(self, workflow_name: str) -> bool:
        """Check if a workflow can be executed based on dependencies."""
        dependencies = self.get_dependencies(workflow_name)
        for dep in dependencies:
            if self.dependency_graph.get(dep, {}).get("status") != "completed":
                return False
        return True
    
    def get_execution_order(self) -> List[str]:
        """Get topological order of workflow execution."""
        # Merkle DAG: topological_sort -> execution_order
        visited = set()
        temp_visited = set()
        result = []
        
        def visit(node: str):
            if node in temp_visited:
                raise ValueError(f"Circular dependency detected: {node}")
            if node in visited:
                return
            
            temp_visited.add(node)
            for dependency in self.get_dependencies(node):
                visit(dependency)
            temp_visited.remove(node)
            visited.add(node)
            result.append(node)
        
        for node in self.dependency_graph:
            if node not in visited:
                visit(node)
        
        return result


@workflow.defn
class DependencyAwareIngestionWorkflow:
    """Ingestion workflow that manages dependencies."""
    
    def __init__(self):
        self.dependency_manager = WorkflowDependencyManager()
    
    @workflow.run
    async def run(self, session_id: str) -> dict:
        """Execute ingestion workflow with dependency management."""
        workflow.logger.info(f"Starting dependency-aware ingestion for session: {session_id}")
        
        try:
            # Check if ingestion can be executed
            if not self.dependency_manager.can_execute("ingestion"):
                raise ValueError("Ingestion workflow dependencies not met")
            
            # Execute ingestion workflow
            from .import_workflows import IngestionWorkflow
            ingestion_workflow = IngestionWorkflow()
            result = await ingestion_workflow.run(session_id)
            
            # Update dependency status
            self.dependency_manager.update_status("ingestion", "completed")
            
            # Signal dependents that ingestion is complete
            await self._signal_dependents("ingestion")
            
            workflow.logger.info(f"Ingestion completed for session: {session_id}")
            return result
            
        except Exception as e:
            workflow.logger.error(f"Ingestion failed for session {session_id}: {e}")
            self.dependency_manager.update_status("ingestion", "failed")
            raise
    
    async def _signal_dependents(self, workflow_name: str):
        """Signal dependent workflows that a workflow has completed."""
        dependents = self.dependency_manager.get_dependents(workflow_name)
        for dependent in dependents:
            workflow.logger.info(f"Signaling dependent workflow: {dependent}")
            # In a real implementation, this would signal other workflows
            # For now, we'll just log the signal


@workflow.defn
class DependencyAwareAnalysisWorkflow:
    """Analysis workflow that waits for ingestion completion."""
    
    def __init__(self):
        self.dependency_manager = WorkflowDependencyManager()
    
    @workflow.run
    async def run(self, model_version: str, notes: str, config: dict) -> dict:
        """Execute analysis workflow with dependency management."""
        workflow.logger.info(f"Starting dependency-aware analysis for model: {model_version}")
        
        try:
            # Wait for ingestion to complete
            await self._wait_for_dependency("ingestion")
            
            # Check if analysis can be executed
            if not self.dependency_manager.can_execute("analysis"):
                raise ValueError("Analysis workflow dependencies not met")
            
            # Execute analysis workflow
            from apps.analyzer.src.workflows import AnalysisWorkflow
            analysis_workflow = AnalysisWorkflow()
            result = await analysis_workflow.run(model_version, notes, config)
            
            # Update dependency status
            self.dependency_manager.update_status("analysis", "completed")
            
            # Signal dependents that analysis is complete
            await self._signal_dependents("analysis")
            
            workflow.logger.info(f"Analysis completed for model: {model_version}")
            return result
            
        except Exception as e:
            workflow.logger.error(f"Analysis failed for model {model_version}: {e}")
            self.dependency_manager.update_status("analysis", "failed")
            raise
    
    async def _wait_for_dependency(self, dependency_name: str):
        """Wait for a dependency to complete."""
        workflow.logger.info(f"Waiting for dependency: {dependency_name}")
        
        # In a real implementation, this would wait for a signal or check status
        # For now, we'll simulate waiting
        await asyncio.sleep(1)
        
        # Check if dependency is completed
        if self.dependency_manager.dependency_graph.get(dependency_name, {}).get("status") != "completed":
            raise ValueError(f"Dependency {dependency_name} not completed")
    
    async def _signal_dependents(self, workflow_name: str):
        """Signal dependent workflows that a workflow has completed."""
        dependents = self.dependency_manager.get_dependents(workflow_name)
        for dependent in dependents:
            workflow.logger.info(f"Signaling dependent workflow: {dependent}")


@workflow.defn
class OrchestratedWorkflow:
    """Orchestrates the entire pipeline with proper dependency management."""
    
    def __init__(self):
        self.dependency_manager = WorkflowDependencyManager()
    
    @workflow.run
    async def run(self, session_ids: List[str], model_version: str, notes: str, config: dict) -> dict:
        """Execute the entire pipeline with dependency management."""
        workflow.logger.info(f"Starting orchestrated workflow for {len(session_ids)} sessions")
        
        try:
            # Step 1: Execute ingestion workflows in parallel
            workflow.logger.info("Step 1: Executing ingestion workflows")
            ingestion_tasks = []
            for session_id in session_ids:
                task = workflow.execute_child_workflow(
                    DependencyAwareIngestionWorkflow.run,
                    session_id,
                    id=f"ingestion-{session_id}",
                    task_queue="importer-task-queue"
                )
                ingestion_tasks.append(task)
            
            # Wait for all ingestion workflows to complete
            ingestion_results = await asyncio.gather(*ingestion_tasks)
            workflow.logger.info(f"Ingestion completed for {len(ingestion_results)} sessions")
            
            # Step 2: Execute analysis workflow
            workflow.logger.info("Step 2: Executing analysis workflow")
            analysis_result = await workflow.execute_child_workflow(
                DependencyAwareAnalysisWorkflow.run,
                model_version,
                notes,
                config,
                id=f"analysis-{model_version}",
                task_queue="analyzer-task-queue"
            )
            
            workflow.logger.info("Analysis workflow completed")
            
            # Step 3: Execute visualization workflow
            workflow.logger.info("Step 3: Executing visualization workflow")
            from apps.analyzer.src.workflows import VisualizationWorkflow
            visualization_result = await workflow.execute_child_workflow(
                VisualizationWorkflow.run,
                analysis_result.get("run_id", "unknown"),
                config,
                id=f"visualization-{model_version}",
                task_queue="analyzer-task-queue"
            )
            
            workflow.logger.info("Visualization workflow completed")
            
            return {
                "status": "SUCCESS",
                "ingestion_results": ingestion_results,
                "analysis_result": analysis_result,
                "visualization_result": visualization_result,
                "total_sessions": len(session_ids)
            }
            
        except Exception as e:
            workflow.logger.error(f"Orchestrated workflow failed: {e}")
            return {
                "status": "FAILED",
                "error": str(e),
                "total_sessions": len(session_ids)
            }


@workflow.defn
class WorkflowStatusMonitor:
    """Monitors workflow status and dependencies."""
    
    @workflow.run
    async def run(self, workflow_id: str) -> dict:
        """Monitor workflow status and dependencies."""
        workflow.logger.info(f"Monitoring workflow: {workflow_id}")
        
        try:
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
            
        except Exception as e:
            workflow.logger.error(f"Failed to monitor workflow {workflow_id}: {e}")
            return {
                "workflow_id": workflow_id,
                "status": "unknown",
                "error": str(e)
            }
