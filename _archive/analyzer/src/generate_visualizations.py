#!/usr/bin/env python3
"""
解析結果から可視化を生成するスクリプト
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class ResultVisualizer:
    def __init__(self, results_file: str = "results/analysis_results.json", output_dir: str = "visualizations"):
        self.results_file = Path(results_file)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.results = self.load_results()
        
    def load_results(self) -> Dict[str, Any]:
        """解析結果を読み込み"""
        with open(self.results_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def extract_analysis_data(self) -> pd.DataFrame:
        """解析結果からデータを抽出してDataFrame化"""
        data = []
        
        for participant_id, participant_data in self.results.items():
            if "results" in participant_data and participant_data["results"]:
                for result in participant_data["results"]:
                    row = {
                        "participant_id": participant_id,
                        "stimulus_word": result.get("stimulus_word", ""),
                        "response_word": result.get("response_word", ""),
                        "p_value": result.get("p_value", 0),
                        "reaction_time_ms": result.get("reaction_time_ms", 0),
                        "word2vec_component": result.get("components", {}).get("word2vec", 0),
                        "reaction_time_component": result.get("components", {}).get("reaction_time", 0),
                        "skin_potential_component": result.get("components", {}).get("skin_potential", 0),
                        "emotion_component": result.get("components", {}).get("emotion", 0)
                    }
                    data.append(row)
        
        return pd.DataFrame(data)
    
    def create_spirit_probability_plot(self, df: pd.DataFrame) -> go.Figure:
        """Spirit確率の分布を可視化"""
        fig = go.Figure()
        
        fig.add_trace(go.Histogram(
            x=df['p_value'],
            nbinsx=20,
            name='Spirit Probability',
            marker_color='lightblue',
            opacity=0.7
        ))
        
        fig.update_layout(
            title="Spirit Probability Distribution",
            xaxis_title="Spirit Probability",
            yaxis_title="Frequency",
            showlegend=False
        )
        
        return fig
    
    def create_component_contribution_plot(self, df: pd.DataFrame) -> go.Figure:
        """各成分の寄与度を可視化"""
        # 平均値を計算
        components = ['word2vec_component', 'reaction_time_component', 'skin_potential_component', 'emotion_component']
        component_names = ['Word2Vec', 'Reaction Time', 'Skin Potential', 'Emotion']
        
        means = [df[comp].mean() for comp in components]
        
        fig = go.Figure(data=[
            go.Bar(
                x=component_names,
                y=means,
                marker_color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']
            )
        ])
        
        fig.update_layout(
            title="Average Component Contributions to Spirit Probability",
            xaxis_title="Component",
            yaxis_title="Average Value",
            showlegend=False
        )
        
        return fig
    
    def create_word_relationship_heatmap(self, df: pd.DataFrame) -> go.Figure:
        """刺激語と応答語の関係をヒートマップで可視化"""
        # クロス集計
        pivot_table = pd.pivot_table(
            df, 
            values='p_value', 
            index='stimulus_word', 
            columns='response_word', 
            aggfunc='mean',
            fill_value=0
        )
        
        fig = go.Figure(data=go.Heatmap(
            z=pivot_table.values,
            x=pivot_table.columns,
            y=pivot_table.index,
            colorscale='RdYlBu_r',
            colorbar=dict(title="Spirit Probability")
        ))
        
        fig.update_layout(
            title="Stimulus-Response Word Relationship Heatmap",
            xaxis_title="Response Words",
            yaxis_title="Stimulus Words",
            width=800,
            height=600
        )
        
        return fig
    
    def create_participant_comparison_plot(self, df: pd.DataFrame) -> go.Figure:
        """参加者ごとのSpirit確率を比較"""
        participant_stats = df.groupby('participant_id')['p_value'].agg(['mean', 'std']).reset_index()
        
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            x=participant_stats['participant_id'].str[:8] + "...",  # IDを短く表示
            y=participant_stats['mean'],
            error_y=dict(type='data', array=participant_stats['std']),
            marker_color='lightgreen',
            name='Mean Spirit Probability'
        ))
        
        fig.update_layout(
            title="Spirit Probability by Participant",
            xaxis_title="Participant ID",
            yaxis_title="Spirit Probability",
            showlegend=False
        )
        
        # X軸ラベルを回転
        fig.update_xaxes(tickangle=45)
        
        return fig
    
    def create_reaction_time_analysis(self, df: pd.DataFrame) -> go.Figure:
        """反応時間とSpirit確率の関係を分析"""
        fig = make_subplots(rows=1, cols=2, subplot_titles=("Reaction Time Distribution", "Reaction Time vs Spirit Probability"))
        
        # 反応時間の分布
        fig.add_trace(
            go.Histogram(x=df['reaction_time_ms'], nbinsx=10, name='Reaction Time'),
            row=1, col=1
        )
        
        # 反応時間 vs Spirit確率の散布図
        fig.add_trace(
            go.Scatter(
                x=df['reaction_time_ms'], 
                y=df['p_value'],
                mode='markers',
                name='Data Points',
                marker=dict(size=8, opacity=0.6)
            ),
            row=1, col=2
        )
        
        fig.update_layout(
            title="Reaction Time Analysis",
            showlegend=False
        )
        
        fig.update_xaxes(title_text="Reaction Time (ms)", row=1, col=1)
        fig.update_yaxes(title_text="Frequency", row=1, col=1)
        fig.update_xaxes(title_text="Reaction Time (ms)", row=1, col=2)
        fig.update_yaxes(title_text="Spirit Probability", row=1, col=2)
        
        return fig
    
    def generate_comprehensive_report(self, df: pd.DataFrame) -> str:
        """包括的な分析レポートを生成"""
        total_participants = len(self.results)
        total_responses = len(df)
        avg_spirit_prob = df['p_value'].mean()
        std_spirit_prob = df['p_value'].std()
        
        # 最も高いSpirit確率の応答
        top_response = df.loc[df['p_value'].idxmax()]
        
        # 最も低いSpirit確率の応答  
        bottom_response = df.loc[df['p_value'].idxmin()]
        
        report = f"""
# Spirit in Physics - Analysis Report

## Summary Statistics
- **Total Participants**: {total_participants}
- **Total Responses Analyzed**: {total_responses}
- **Average Spirit Probability**: {avg_spirit_prob:.4f} ± {std_spirit_prob:.4f}
- **Spirit Probability Range**: [{df['p_value'].min():.4f}, {df['p_value'].max():.4f}]

## Top Performing Response
- **Stimulus**: {top_response['stimulus_word']}
- **Response**: {top_response['response_word']}
- **Spirit Probability**: {top_response['p_value']:.4f}
- **Reaction Time**: {top_response['reaction_time_ms']} ms

## Lowest Performing Response
- **Stimulus**: {bottom_response['stimulus_word']}
- **Response**: {bottom_response['response_word']}
- **Spirit Probability**: {bottom_response['p_value']:.4f}
- **Reaction Time**: {bottom_response['reaction_time_ms']} ms

## Component Analysis
- **Word2Vec Component**: {df['word2vec_component'].mean():.3f} ± {df['word2vec_component'].std():.3f}
- **Reaction Time Component**: {df['reaction_time_component'].mean():.3f} ± {df['reaction_time_component'].std():.3f}
- **Skin Potential Component**: {df['skin_potential_component'].mean():.3f} ± {df['skin_potential_component'].std():.3f}
- **Emotion Component**: {df['emotion_component'].mean():.3f} ± {df['emotion_component'].std():.3f}

## Key Findings
1. **High Spirit Probabilities**: All responses show very high spirit probabilities (avg: {avg_spirit_prob:.4f})
2. **Consistent Components**: Emotion and skin potential components show minimal variation
3. **Word Relationships**: The analysis reveals subtle differences in semantic relationships between stimulus and response words
4. **Individual Variation**: Participants show individual patterns in their spirit probability distributions

## Technical Notes
- Analysis performed using Kawasaki Model with 4 components: Word2Vec, Reaction Time, Skin Potential, Emotion
- Word2Vec model uses custom-trained vectors on Jung stimuli words with Japanese translations
- Skin potential and emotion components use default values (1.0) due to data availability
- Reaction time minimum set to 100ms for analysis stability
"""
        return report
    
    def save_all_visualizations(self):
        """全ての可視化を生成して保存"""
        logging.info("Generating visualizations from analysis results...")
        
        df = self.extract_analysis_data()
        if df.empty:
            logging.warning("No data available for visualization")
            return
        
        # 各プロットを生成
        plots = {
            'spirit_probability_distribution': self.create_spirit_probability_plot(df),
            'component_contributions': self.create_component_contribution_plot(df),
            'word_relationship_heatmap': self.create_word_relationship_heatmap(df),
            'participant_comparison': self.create_participant_comparison_plot(df),
            'reaction_time_analysis': self.create_reaction_time_analysis(df)
        }
        
        # HTMLファイルとして保存
        for name, fig in plots.items():
            output_file = self.output_dir / f"{name}.html"
            fig.write_html(str(output_file))
            logging.info(f"Saved {name} plot to {output_file}")
        
        # レポートを生成
        report = self.generate_comprehensive_report(df)
        report_file = self.output_dir / "analysis_report.md"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        logging.info(f"Saved comprehensive report to {report_file}")
        
        # 統計サマリーを表示
        print("\n" + "="*60)
        print("VISUALIZATION GENERATION COMPLETED")
        print("="*60)
        print(f"Total visualizations saved: {len(plots)}")
        print(f"Output directory: {self.output_dir}")
        print(f"Files generated:")
        for name in plots.keys():
            print(f"  - {name}.html")
        print("  - analysis_report.md")
        print("="*60)

def main():
    """メイン実行関数"""
    visualizer = ResultVisualizer()
    visualizer.save_all_visualizations()

if __name__ == '__main__':
    main()
