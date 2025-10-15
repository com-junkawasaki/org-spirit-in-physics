#!/usr/bin/env python3
"""
Workflow Visualization Script for Spirit in Physics Pipeline

This script generates workflow state machine graphs and visualizations
using the Serverless Workflow SDK's StateMachineHelper.
"""

import sys
from pathlib import Path
from typing import Optional, List

from workflow_manager import get_workflow_manager

# Merkle DAG: workflow_visualization -> workflow_definitions
def generate_workflow_visualization(workflow_id: str, output_dir: str = "visualizations",
                                  graph_engine: str = "mermaid") -> str:
    """
    Generate workflow visualization for a specific workflow.

    Args:
        workflow_id: ID of the workflow to visualize
        output_dir: Directory to save the visualization
        graph_engine: Graph engine to use ('mermaid' or 'graphviz')

    Returns:
        Path to the generated visualization file
    """
    print(f"🎨 Generating visualization for workflow: {workflow_id}")

    workflow_manager = get_workflow_manager()

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    try:
        # Generate the workflow graph
        mermaid_code = workflow_manager.generate_workflow_graph(
            workflow_id,
            str(output_path / f"{workflow_id}_graph.md"),
            get_actions=True
        )

        print(f"  ✅ Generated Mermaid graph for {workflow_id}")

        # Save Mermaid code for documentation
        mermaid_file = output_path / f"{workflow_id}_graph.md"
        with open(mermaid_file, 'w') as f:
            f.write(f"# {workflow_id} Workflow Graph\n\n")
            f.write("```mermaid\n")
            f.write(mermaid_code)
            f.write("\n```\n")

        print(f"  📝 Mermaid code saved to: {mermaid_file}")

        return str(mermaid_file)

    except Exception as e:
        print(f"  ❌ Failed to generate visualization for {workflow_id}: {e}")
        raise

def generate_all_workflow_visualizations(output_dir: str = "workflow_visualizations") -> List[str]:
    """
    Generate visualizations for all available workflows.

    Args:
        output_dir: Directory to save all visualizations

    Returns:
        List of generated visualization file paths
    """
    print("🎨 Generating visualizations for all workflows")
    print("=" * 60)

    workflow_manager = get_workflow_manager()
    workflows = workflow_manager.list_workflows()

    generated_files = []

    for workflow_id in workflows:
        try:
            file_path = generate_workflow_visualization(workflow_id, output_dir)
            generated_files.append(file_path)
        except Exception as e:
            print(f"❌ Failed to visualize {workflow_id}: {e}")

    print(f"\n📁 Generated {len(generated_files)} workflow visualizations in: {output_dir}")
    return generated_files

def create_workflow_comparison_report(output_dir: str = "workflow_reports") -> str:
    """
    Create a comparison report of all workflows.

    Args:
        output_dir: Directory to save the report

    Returns:
        Path to the generated report file
    """
    print("📊 Creating workflow comparison report")

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    workflow_manager = get_workflow_manager()
    workflows = workflow_manager.list_workflows()

    report_file = output_path / "workflow_comparison_report.md"

    with open(report_file, 'w') as f:
        f.write("# Spirit in Physics Pipeline - Workflow Comparison Report\n\n")
        f.write("This report provides an overview and comparison of all workflow definitions.\n\n")

        f.write("## Available Workflows\n\n")
        f.write("| Workflow ID | Description | States | Functions | Start State |\n")
        f.write("|-------------|-------------|--------|-----------|-------------|\n")

        for workflow_id in workflows:
            try:
                info = workflow_manager.get_workflow_info(workflow_id)
                f.write(f"| {workflow_id} | {info.get('description', 'N/A')} | {info.get('states_count', 'N/A')} | {info.get('functions_count', 'N/A')} | {info.get('start_state', 'N/A')} |\n")
            except Exception as e:
                f.write(f"| {workflow_id} | Error: {e} | N/A | N/A | N/A |\n")

        f.write("\n## Workflow Details\n\n")

        for workflow_id in workflows:
            f.write(f"### {workflow_id}\n\n")
            try:
                info = workflow_manager.get_workflow_info(workflow_id)
                f.write(f"- **Description**: {info.get('description', 'N/A')}\n")
                f.write(f"- **Version**: {info.get('version', 'N/A')}\n")
                f.write(f"- **Spec Version**: {info.get('spec_version', 'N/A')}\n")
                f.write(f"- **Start State**: {info.get('start_state', 'N/A')}\n")
                f.write(f"- **States**: {info.get('states_count', 'N/A')}\n")
                f.write(f"- **Functions**: {info.get('functions_count', 'N/A')}\n\n")

                # Try to include the Mermaid graph
                try:
                    mermaid_code = workflow_manager.generate_workflow_graph(workflow_id)
                    f.write("#### Workflow Graph\n\n")
                    f.write("```mermaid\n")
                    f.write(mermaid_code)
                    f.write("\n```\n\n")
                except Exception as e:
                    f.write(f"*Could not generate workflow graph: {e}*\n\n")

            except Exception as e:
                f.write(f"*Error retrieving workflow info: {e}*\n\n")

    print(f"  📋 Report saved to: {report_file}")
    return str(report_file)

def create_workflow_documentation(output_dir: str = "workflow_docs") -> str:
    """
    Create comprehensive workflow documentation.

    Args:
        output_dir: Directory to save the documentation

    Returns:
        Path to the generated documentation file
    """
    print("📚 Creating workflow documentation")

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    workflow_manager = get_workflow_manager()
    workflows = workflow_manager.list_workflows()

    doc_file = output_path / "workflow_documentation.md"

    with open(doc_file, 'w') as f:
        f.write("# Spirit in Physics Pipeline - Workflow Documentation\n\n")
        f.write("## Overview\n\n")
        f.write("This document provides comprehensive documentation for all Serverless Workflow definitions ")
        f.write("used in the Spirit in Physics Pipeline. These workflows are built using the Serverless Workflow SDK ")
        f.write("and follow the Cloud Native Computing Foundation (CNCF) Serverless Workflow specification.\n\n")

        f.write("## Architecture\n\n")
        f.write("The pipeline uses a modular workflow architecture where each workflow represents a specific ")
        f.write("type of data processing or analysis task. Workflows are defined programmatically using Python ")
        f.write("classes and can be validated, visualized, and executed using the Serverless Workflow SDK.\n\n")

        f.write("### Workflow Types\n\n")

        # Document each workflow type
        workflow_descriptions = {
            "unified-pipeline-workflow": {
                "purpose": "Complete end-to-end pipeline for Spirit in Physics data processing",
                "use_case": "General data analysis workflows",
                "states": ["DataIngestion", "AnalysisProcessing", "StoreResults"],
                "features": ["Multi-stage processing", "Comprehensive analysis", "Result storage"]
            },
            "physiological-workflow": {
                "purpose": "Specialized workflow for physiological experiments with sensor data",
                "use_case": "Experiments involving physiological measurements",
                "states": ["PhysiologicalDataIngestion", "HumeAIAnalysis", "PhysiologicalFeatureExtraction", "SpiritProbabilityCalculation", "StorePhysiologicalResults"],
                "features": ["Enhanced physiological processing", "Sensor data integration", "Physiological feature extraction"]
            },
            "online-workflow": {
                "purpose": "Optimized workflow for online experiments focusing on behavioral analysis",
                "use_case": "Real-time or online participant interactions",
                "states": ["OnlineDataIngestion", "HumeAIAnalysisOnline", "BehavioralFeatureExtraction", "OnlineSpiritProbabilityCalculation", "StoreOnlineResults"],
                "features": ["Behavioral analysis", "Real-time processing", "Interaction quality assessment"]
            },
            "data-import-workflow": {
                "purpose": "Workflow for importing participant data from external sources",
                "use_case": "Data ingestion and migration",
                "states": ["FetchParticipantData", "ProcessParticipants", "UpdateImportStatus"],
                "features": ["Batch data import", "Participant processing", "Import status tracking"]
            },
            "ingestion-workflow": {
                "purpose": "Basic workflow for ingesting session data into the system",
                "use_case": "Simple data ingestion tasks",
                "states": ["ValidateSessionData", "StoreRawData", "UpdateIngestionStatus"],
                "features": ["Data validation", "Raw data storage", "Ingestion tracking"]
            }
        }

        for workflow_id, details in workflow_descriptions.items():
            if workflow_id in workflows:
                f.write(f"### {workflow_id.replace('-', ' ').title()}\n\n")
                f.write(f"**Purpose**: {details['purpose']}\n\n")
                f.write(f"**Use Case**: {details['use_case']}\n\n")
                f.write("**States**:\n")
                for state in details['states']:
                    f.write(f"- {state}\n")
                f.write("\n**Features**:\n")
                for feature in details['features']:
                    f.write(f"- {feature}\n")
                f.write("\n---\n\n")

        f.write("## Usage\n\n")
        f.write("### Validation\n\n")
        f.write("```bash\n")
        f.write("cd apps/pipeline/src/workflows\n")
        f.write("python validate_workflows.py\n")
        f.write("```\n\n")

        f.write("### Visualization\n\n")
        f.write("```bash\n")
        f.write("cd apps/pipeline/src/workflows\n")
        f.write("python visualize_workflows.py\n")
        f.write("```\n\n")

        f.write("### Execution\n\n")
        f.write("Workflows are executed through the workflow runner:\n\n")
        f.write("```python\n")
        f.write("from workflows.main_workflow import execute_unified_pipeline_workflow\n")
        f.write("\n")
        f.write("result = await execute_unified_pipeline_workflow(\n")
        f.write("    session_ids=['session_1', 'session_2'],\n")
        f.write("    model_version='1.0',\n")
        f.write("    notes='Analysis run',\n")
        f.write("    config={...}\n")
        f.write(")\n")
        f.write("```\n\n")

        f.write("## Technical Details\n\n")
        f.write("### Serverless Workflow Specification\n\n")
        f.write("- **Specification Version**: 0.8\n")
        f.write("- **SDK**: serverless-workflow-sdk (Python)\n")
        f.write("- **Validation**: Built-in schema validation\n")
        f.write("- **Visualization**: Mermaid graph generation\n\n")

        f.write("### State Types\n\n")
        f.write("- **Operation State**: Executes functions and actions\n")
        f.write("- **Foreach State**: Iterates over collections\n")
        f.write("- **Transition**: Moves between states\n")
        f.write("- **End State**: Terminates workflow execution\n\n")

        f.write("### Function References\n\n")
        f.write("Functions are referenced using module paths to activity implementations:\n\n")
        f.write("```\n")
        f.write("spirit_in_physics_pipeline.activities::Neo4jActivities.store_raw_hume_data\n")
        f.write("spirit_in_physics_pipeline.activities::HumeActivities.process_hume_analysis\n")
        f.write("```\n\n")

    print(f"  📖 Documentation saved to: {doc_file}")
    return str(doc_file)

def main():
    """Main function to run workflow visualization."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate workflow visualizations for Spirit in Physics Pipeline"
    )
    parser.add_argument(
        "--workflow",
        help="Specific workflow ID to visualize (if not provided, visualizes all)"
    )
    parser.add_argument(
        "--output-dir",
        default="workflow_visualizations",
        help="Output directory for generated files (default: workflow_visualizations)"
    )
    parser.add_argument(
        "--report",
        action="store_true",
        help="Generate workflow comparison report"
    )
    parser.add_argument(
        "--docs",
        action="store_true",
        help="Generate comprehensive workflow documentation"
    )

    args = parser.parse_args()

    generated_files = []

    # Generate visualizations
    if args.workflow:
        # Visualize specific workflow
        try:
            file_path = generate_workflow_visualization(args.workflow, args.output_dir)
            generated_files.append(file_path)
        except Exception as e:
            print(f"❌ Failed to visualize workflow {args.workflow}: {e}")
            sys.exit(1)
    else:
        # Visualize all workflows
        generated_files.extend(generate_all_workflow_visualizations(args.output_dir))

    # Generate comparison report
    if args.report:
        try:
            report_file = create_workflow_comparison_report(args.output_dir)
            generated_files.append(report_file)
        except Exception as e:
            print(f"❌ Failed to generate comparison report: {e}")

    # Generate documentation
    if args.docs:
        try:
            doc_file = create_workflow_documentation(args.output_dir)
            generated_files.append(doc_file)
        except Exception as e:
            print(f"❌ Failed to generate documentation: {e}")

    print(f"\n✅ Generated {len(generated_files)} files in {args.output_dir}")
    for file_path in generated_files:
        print(f"  📄 {file_path}")

if __name__ == "__main__":
    main()
