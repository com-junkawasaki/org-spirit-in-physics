#!/usr/bin/env python3
"""
Visualization script for Spirit in Physics analysis results.
This script now fetches data directly from ArangoDB.
"""

import json
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from datetime import datetime
import os
import argparse
import yaml
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from packages.spirit_in_physics_pipeline.arangodb_client import ArangoDBClient

class VisualizationGenerator:
    def __init__(self, config):
        self.client = ArangoDBClient(
            server_url=config['arangodb']['url'],
            user=config['arangodb']['user'],
            password=config['arangodb']['password']
        )
        self.db = None
        self.output_dir = "apps/analyzer/visualizations"
        os.makedirs(self.output_dir, exist_ok=True)

    def connect(self):
        if self.client.connect():
            if self.client.create_database():
                self.db = self.client.db
                return True
        return False

    def fetch_results_for_run(self, run_id: str):
        """Load analysis results from ArangoDB for a specific run."""
        if not self.db:
            raise ConnectionError("Not connected to ArangoDB")

        aql_query = """
        FOR result IN analysis_results
            FILTER result.run_id == @run_id
            LET response = DOCUMENT('participant_session_responses', result.response_id)
            RETURN {
                'spirit_probability': result.p_value,
                'reaction_time_ms': response.reaction_time_ms,
                'stimulus_word': response.stimulus_word,
                'response_word': response.response_word
            }
        """
        cursor = self.db.aql.execute(aql_query, bind_vars={'run_id': run_id})
        return list(cursor)

    def generate_all(self, run_id: str):
        results = self.fetch_results_for_run(run_id)
        if not results:
            print(f"No results found for run_id: {run_id}")
            return

        print(f"Generating visualizations for {len(results)} results from run {run_id}...")

        self.create_spirit_probability_distribution(results, run_id)
        self.create_reaction_time_vs_spirit_scatter(results, run_id)
        self.create_word_length_analysis(results, run_id)
        self.generate_html_report(results, run_id)
        print("Visualizations generated successfully.")

    def create_spirit_probability_distribution(self, results, run_id):
        spirit_probs = [r['spirit_probability'] for r in results if r]
    plt.figure(figsize=(10, 6))
    plt.hist(spirit_probs, bins=20, alpha=0.7, edgecolor='black')
    plt.xlabel('Spirit Probability')
    plt.ylabel('Frequency')
        plt.title(f'Distribution of Spirit Probabilities (Run: {run_id})')
    plt.grid(True, alpha=0.3)
        plt.savefig(os.path.join(self.output_dir, f'{run_id}_spirit_probability_distribution.png'), dpi=300, bbox_inches='tight')
        plt.close()

    def create_reaction_time_vs_spirit_scatter(self, results, run_id):
        reaction_times = [r['reaction_time_ms'] for r in results if r]
        spirit_probs = [r['spirit_probability'] for r in results if r]
    plt.figure(figsize=(10, 6))
    plt.scatter(reaction_times, spirit_probs, alpha=0.6)
    plt.xlabel('Reaction Time (ms)')
    plt.ylabel('Spirit Probability')
        plt.title(f'Reaction Time vs Spirit Probability (Run: {run_id})')
    plt.grid(True, alpha=0.3)
    z = np.polyfit(reaction_times, spirit_probs, 1)
    p = np.poly1d(z)
    plt.plot(reaction_times, p(reaction_times), "r--", alpha=0.8, label=f'Trend line (slope: {z[0]:.4f})')
    plt.legend()
        plt.savefig(os.path.join(self.output_dir, f'{run_id}_reaction_time_vs_spirit.png'), dpi=300, bbox_inches='tight')
        plt.close()

    def create_word_length_analysis(self, results, run_id):
        stimulus_lengths = [len(r['stimulus_word']) for r in results if r and r.get('stimulus_word')]
        response_lengths = [len(r['response_word']) for r in results if r and r.get('response_word')]
        spirit_probs = [r['spirit_probability'] for r in results if r]

    plt.figure(figsize=(12, 5))

    plt.subplot(1, 2, 1)
        plt.scatter(stimulus_lengths, spirit_probs[:len(stimulus_lengths)], alpha=0.6, label='Stimulus')
        plt.scatter(response_lengths, spirit_probs[:len(response_lengths)], alpha=0.6, label='Response')
    plt.xlabel('Word Length')
    plt.ylabel('Spirit Probability')
    plt.title('Word Length vs Spirit Probability')
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
        length_diffs = [abs(len(r['stimulus_word']) - len(r['response_word'])) for r in results if r and r.get('stimulus_word') and r.get('response_word')]
        plt.scatter(length_diffs, spirit_probs[:len(length_diffs)], alpha=0.6)
    plt.xlabel('Absolute Length Difference')
    plt.ylabel('Spirit Probability')
    plt.title('Length Difference vs Spirit Probability')
    plt.grid(True, alpha=0.3)

    plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, f'{run_id}_word_length_analysis.png'), dpi=300, bbox_inches='tight')
        plt.close()

    def generate_html_report(self, results, run_id):
        spirit_probs = [r['spirit_probability'] for r in results if r]
        reaction_times = [r['reaction_time_ms'] for r in results if r]
    avg_spirit = np.mean(spirit_probs)
    max_spirit = np.max(spirit_probs)
    min_spirit = np.min(spirit_probs)
    avg_reaction = np.mean(reaction_times)

    html_content = f"""
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
            <title>Spirit in Physics - Analysis Report (Run: {run_id})</title>
    </head>
    <body>
            <h1>Spirit in Physics - Analysis Report</h1>
            <h2>Run ID: {run_id}</h2>
                <p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <h3>Overall Statistics</h3>
            <ul>
                <li>Total Responses: {len(results)}</li>
                <li>Average Spirit Probability: {avg_spirit:.4f}</li>
                <li>Max Spirit Probability: {max_spirit:.4f}</li>
                <li>Min Spirit Probability: {min_spirit:.4f}</li>
                <li>Average Reaction Time: {avg_reaction:.0f}ms</li>
            </ul>
            <h3>Visualizations</h3>
            <img src="{run_id}_spirit_probability_distribution.png" alt="Spirit Probability Distribution">
            <img src="{run_id}_reaction_time_vs_spirit.png" alt="Reaction Time vs Spirit Probability">
            <img src="{run_id}_word_length_analysis.png" alt="Word Length Analysis">
    </body>
    </html>
        """
        report_path = os.path.join(self.output_dir, f'{run_id}_analysis_report.html')
        with open(report_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
        print(f"HTML report generated at: {report_path}")

def main():
    parser = argparse.ArgumentParser(description="Generate visualizations for a specific analysis run from ArangoDB.")
    parser.add_argument('--run-id', type=str, required=True, help='The ID of the analysis run to visualize.')
    parser.add_argument('--config', type=str, default='apps/analyzer/config.yaml', help='Path to the configuration file.')
    args = parser.parse_args()

    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    visualizer = VisualizationGenerator(config)
    if visualizer.connect():
        visualizer.generate_all(args.run_id)
        visualizer.client.close()
    else:
        print("Failed to connect to ArangoDB.")

if __name__ == "__main__":
    main()
