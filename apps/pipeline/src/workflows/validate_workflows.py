#!/usr/bin/env python3
"""
Workflow Validation Script for Spirit in Physics Pipeline

This script validates all workflow definitions using the Serverless Workflow SDK
and generates validation reports.
"""

import sys
import json
from pathlib import Path

from workflow_manager import get_workflow_manager

# Merkle DAG: workflow_validation -> workflow_definitions
def validate_all_workflows():
    """
    Validate all workflow definitions and generate a comprehensive report.

    Returns:
        Dictionary containing validation results and summary
    """
    print("🔍 Validating Serverless Workflow Definitions for Spirit in Physics Pipeline")
    print("=" * 70)

    workflow_manager = get_workflow_manager()

    # Get all workflows
    workflows = workflow_manager.list_workflows()
    print(f"📋 Found {len(workflows)} workflow definitions: {', '.join(workflows)}")
    print()

    validation_results = {}
    summary = {
        "total_workflows": len(workflows),
        "valid_workflows": 0,
        "invalid_workflows": 0,
        "validation_errors": []
    }

    # Validate each workflow
    for workflow_id in workflows:
        print(f"🔎 Validating workflow: {workflow_id}")
        try:
            # Validate the workflow
            is_valid = workflow_manager.validate_workflow(workflow_id)

            if is_valid:
                print(f"  ✅ {workflow_id}: VALID")
                validation_results[workflow_id] = {
                    "status": "VALID",
                    "details": workflow_manager.get_workflow_info(workflow_id)
                }
                summary["valid_workflows"] += 1
            else:
                print(f"  ❌ {workflow_id}: INVALID")
                validation_results[workflow_id] = {
                    "status": "INVALID",
                    "error": "Validation failed but no specific error captured"
                }
                summary["invalid_workflows"] += 1

        except Exception as e:
            print(f"  ❌ {workflow_id}: ERROR - {str(e)}")
            validation_results[workflow_id] = {
                "status": "ERROR",
                "error": str(e)
            }
            summary["invalid_workflows"] += 1
            summary["validation_errors"].append({
                "workflow": workflow_id,
                "error": str(e)
            })

        print()

    # Generate summary report
    print("=" * 70)
    print("📊 VALIDATION SUMMARY")
    print("=" * 70)
    print(f"Total workflows: {summary['total_workflows']}")
    print(f"Valid workflows: {summary['valid_workflows']} ✅")
    print(f"Invalid workflows: {summary['invalid_workflows']} ❌")
    print()

    if summary["validation_errors"]:
        print("🚨 VALIDATION ERRORS:")
        for error in summary["validation_errors"]:
            print(f"  • {error['workflow']}: {error['error']}")
        print()

    # Overall status
    if summary["invalid_workflows"] == 0:
        print("🎉 ALL WORKFLOWS ARE VALID! Ready for deployment.")
        overall_status = "SUCCESS"
    else:
        print(f"⚠️  {summary['invalid_workflows']} workflow(s) failed validation.")
        print("Please fix the validation errors before deployment.")
        overall_status = "FAILURE"

    summary["overall_status"] = overall_status

    return {
        "summary": summary,
        "validation_results": validation_results
    }

def generate_workflow_graphs(output_dir: str = "workflow_graphs"):
    """
    Generate workflow state machine graphs for all workflows.

    Args:
        output_dir: Directory to save the generated graphs
    """
    print(f"📈 Generating workflow graphs in directory: {output_dir}")
    print("-" * 50)

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    workflow_manager = get_workflow_manager()
    workflows = workflow_manager.list_workflows()

    for workflow_id in workflows:
        try:
            print(f"Generating graph for: {workflow_id}")

            # Generate Mermaid graph
            mermaid_code = workflow_manager.generate_workflow_graph(
                workflow_id,
                output_path / f"{workflow_id}_graph.md"
            )

            print(f"  ✅ Generated Mermaid graph for {workflow_id}")

            # Try to generate visual graph if possible
            try:
                svg_path = output_path / f"{workflow_id}_graph.svg"
                # Note: In a real implementation, you might use a library like graphviz
                # to convert the Mermaid code to SVG
                print(f"  📝 Mermaid code saved to {workflow_id}_graph.md")
            except Exception as e:
                print(f"  ⚠️  Could not generate visual graph: {e}")

        except Exception as e:
            print(f"  ❌ Failed to generate graph for {workflow_id}: {e}")

    print(f"\n📁 Workflow graphs saved to: {output_path.absolute()}")

def export_workflow_definitions(output_dir: str = "workflow_exports"):
    """
    Export all workflow definitions in different formats.

    Args:
        output_dir: Directory to save the exported definitions
    """
    print(f"💾 Exporting workflow definitions to: {output_dir}")
    print("-" * 50)

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    workflow_manager = get_workflow_manager()
    workflows = workflow_manager.list_workflows()

    for workflow_id in workflows:
        try:
            print(f"Exporting: {workflow_id}")

            # Export as YAML
            yaml_content = workflow_manager.export_workflow(workflow_id, "yaml")
            yaml_file = output_path / f"{workflow_id}.yaml"
            with open(yaml_file, 'w') as f:
                f.write(yaml_content)
            print(f"  📄 YAML: {yaml_file}")

            # Export as JSON
            json_content = workflow_manager.export_workflow(workflow_id, "json")
            json_file = output_path / f"{workflow_id}.json"
            with open(json_file, 'w') as f:
                f.write(json_content)
            print(f"  📋 JSON: {json_file}")

        except Exception as e:
            print(f"  ❌ Failed to export {workflow_id}: {e}")

    print(f"\n📁 Workflow definitions exported to: {output_path.absolute()}")

def main():
    """Main function to run workflow validation and generate reports."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Validate Serverless Workflow definitions for Spirit in Physics Pipeline"
    )
    parser.add_argument(
        "--graphs",
        action="store_true",
        help="Generate workflow state machine graphs"
    )
    parser.add_argument(
        "--export",
        action="store_true",
        help="Export workflow definitions in YAML and JSON formats"
    )
    parser.add_argument(
        "--output-dir",
        default="validation_output",
        help="Output directory for generated files (default: validation_output)"
    )
    parser.add_argument(
        "--json-report",
        action="store_true",
        help="Generate JSON validation report"
    )

    args = parser.parse_args()

    # Run validation
    results = validate_all_workflows()

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)

    # Generate JSON report if requested
    if args.json_report:
        report_file = output_dir / "validation_report.json"
        with open(report_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"📋 JSON report saved to: {report_file}")

    # Generate workflow graphs if requested
    if args.graphs:
        graph_dir = output_dir / "graphs"
        generate_workflow_graphs(str(graph_dir))

    # Export workflow definitions if requested
    if args.export:
        export_dir = output_dir / "definitions"
        export_workflow_definitions(str(export_dir))

    # Exit with appropriate code
    if results["summary"]["overall_status"] == "SUCCESS":
        print("\n✅ Workflow validation completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Workflow validation failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
