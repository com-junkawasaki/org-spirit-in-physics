#!/usr/bin/env python3
"""
Spirit in Physics の可視化コンポーネント
分析結果のインタラクティブな可視化を提供
"""

import logging
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Any, Optional
import json
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class SpiritVisualizer:
    def __init__(self, output_dir: str = "visualizations"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # プロットのスタイル設定
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
        logging.info(f"SpiritVisualizer initialized. Output directory: {output_dir}")

    def create_spirit_vector_plot(self, analysis_results: List[Dict[str, Any]], 
                                save_path: Optional[str] = None) -> go.Figure:
        """
        Spiritベクトルの3D可視化を作成
        """
        if not analysis_results:
            logging.warning("No analysis results provided for visualization")
            return None
        
        # データを準備
        stimuli_words = []
        response_words = []
        p_values = []
        spirit_vectors = []
        
        for result in analysis_results:
            raw_inputs = result.get('raw_inputs', {})
            stimuli_words.append(raw_inputs.get('stimulus_word', ''))
            response_words.append(raw_inputs.get('response_word', ''))
            p_values.append(result.get('p_value', 0))
            
            # Spiritベクトルの計算（簡易版）
            components = result.get('components', {})
            spirit_vector = [
                components.get('word2vec', 0),
                components.get('reaction_time', 0),
                components.get('skin_potential', 0)
            ]
            spirit_vectors.append(spirit_vector)
        
        # DataFrame作成
        df = pd.DataFrame({
            'stimulus': stimuli_words,
            'response': response_words,
            'p_value': p_values,
            'x': [v[0] for v in spirit_vectors],
            'y': [v[1] for v in spirit_vectors],
            'z': [v[2] for v in spirit_vectors]
        })
        
        # 3D散布図の作成
        fig = go.Figure(data=[go.Scatter3d(
            x=df['x'],
            y=df['y'],
            z=df['z'],
            mode='markers+text',
            marker=dict(
                size=df['p_value'] * 20 + 5,  # P値に応じたサイズ
                color=df['p_value'],
                colorscale='Viridis',
                opacity=0.8,
                colorbar=dict(title="Spirit Probability")
            ),
            text=[f"{s}->{r}" for s, r in zip(df['stimulus'], df['response'])],
            hovertemplate=(
                "Stimulus: %{text}<br>" +
                "Spirit Vector: (%{x:.2f}, %{y:.2f}, %{z:.2f})<br>" +
                "Probability: %{marker.color:.4f}<br>" +
                "<extra></extra>"
            )
        )])
        
        # レイアウト設定
        fig.update_layout(
            title="Spirit Vector Space (3D Visualization)",
            scene=dict(
                xaxis_title="Word2Vec Component",
                yaxis_title="Reaction Time Component", 
                zaxis_title="Skin Potential Component",
                camera=dict(
                    eye=dict(x=1.5, y=1.5, z=1.5)
                )
            ),
            width=800,
            height=600
        )
        
        if save_path:
            fig.write_html(save_path)
            logging.info(f"3D plot saved to {save_path}")
        
        return fig

    def create_component_analysis_plot(self, analysis_results: List[Dict[str, Any]], 
                                     save_path: Optional[str] = None) -> go.Figure:
        """
        各成分の寄与度を分析するプロット
        """
        if not analysis_results:
            return None
        
        # データを準備
        data = []
        for result in analysis_results:
            components = result.get('components', {})
            raw_inputs = result.get('raw_inputs', {})
            
            data.append({
                'stimulus_response': f"{raw_inputs.get('stimulus_word', '')}->{raw_inputs.get('response_word', '')}",
                'word2vec': components.get('word2vec', 0),
                'reaction_time': components.get('reaction_time', 0),
                'skin_potential': components.get('skin_potential', 0),
                'emotion': components.get('emotion', 0),
                'p_value': result.get('p_value', 0)
            })
        
        df = pd.DataFrame(data)
        
        # 積み上げ棒グラフの作成
        fig = go.Figure()
        
        components = ['word2vec', 'reaction_time', 'skin_potential', 'emotion']
        colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']
        
        for i, component in enumerate(components):
            fig.add_trace(go.Bar(
                name=component.replace('_', ' ').title(),
                x=df['stimulus_response'],
                y=df[component],
                marker_color=colors[i],
                offsetgroup=0
            ))
        
        fig.update_layout(
            title="Spirit Model Components Analysis",
            xaxis_title="Stimulus -> Response",
            yaxis_title="Component Value",
            barmode='stack',
            width=1000,
            height=600
        )
        
        # X軸ラベルを回転
        fig.update_xaxes(tickangle=45)
        
        if save_path:
            fig.write_html(save_path)
            logging.info(f"Component analysis plot saved to {save_path}")
        
        return fig

    def create_timeseries_plot(self, physiological_data: List[Dict[str, Any]], 
                             emotion_data: List[Dict[str, Any]], 
                             stimulus_timestamp: int = 0,
                             save_path: Optional[str] = None) -> go.Figure:
        """
        時系列データの可視化（皮膚電位と感情）
        """
        fig = make_subplots(
            rows=2, cols=1,
            subplot_titles=("Skin Potential Time Series", "Emotion Time Series"),
            shared_xaxes=True
        )
        
        # 皮膚電位データのプロット
        if physiological_data:
            timestamps = [d['timestamp_offset_ms'] for d in physiological_data]
            values = [d['value'] for d in physiological_data]
            
            fig.add_trace(
                go.Scatter(
                    x=timestamps, 
                    y=values,
                    mode='lines+markers',
                    name='Skin Potential',
                    line=dict(color='blue', width=2),
                    marker=dict(size=4)
                ),
                row=1, col=1
            )
            
            # 刺激タイミングの線
            fig.add_vline(x=stimulus_timestamp, line_dash="dash", line_color="red", 
                         annotation_text="Stimulus", row=1, col=1)
        
        # 感情データのプロット
        if emotion_data:
            # 感情データをグループ化
            emotion_groups = {}
            for item in emotion_data:
                source = item['source']
                if source not in emotion_groups:
                    emotion_groups[source] = {'timestamps': [], 'emotions': {}}
                
                emotion_groups[source]['timestamps'].append(item['timestamp_offset_ms'])
                for emotion, value in item['emotion_data'].items():
                    if emotion not in emotion_groups[source]['emotions']:
                        emotion_groups[source]['emotions'][emotion] = []
                    emotion_groups[source]['emotions'][emotion].append(value)
            
            # 各感情ソースをプロット
            colors = ['red', 'green', 'blue', 'orange', 'purple']
            for i, (source, data) in enumerate(emotion_groups.items()):
                color_idx = i % len(colors)
                
                for emotion in ['joy', 'sadness', 'anger', 'fear', 'surprise']:
                    if emotion in data['emotions']:
                        fig.add_trace(
                            go.Scatter(
                                x=data['timestamps'],
                                y=data['emotions'][emotion],
                                mode='lines',
                                name=f"{source} - {emotion}",
                                line=dict(color=colors[color_idx], width=1, dash='dot'),
                                showlegend=True
                            ),
                            row=2, col=1
                        )
        
        # レイアウト設定
        fig.update_layout(
            title="Physiological and Emotional Time Series",
            xaxis_title="Time (ms)",
            height=800,
            showlegend=True
        )
        
        fig.update_yaxes(title_text="Skin Potential (μV)", row=1, col=1)
        fig.update_yaxes(title_text="Emotion Intensity", row=2, col=1)
        fig.update_xaxes(title_text="Time (ms)", row=2, col=1)
        
        if save_path:
            fig.write_html(save_path)
            logging.info(f"Time series plot saved to {save_path}")
        
        return fig

    def create_heatmap_visualization(self, analysis_results: List[Dict[str, Any]], 
                                   save_path: Optional[str] = None) -> go.Figure:
        """
        刺激語と応答語の関係性をヒートマップで可視化
        """
        if not analysis_results:
            return None
        
        # ユニークな単語を集める
        stimuli_words = list(set(r.get('raw_inputs', {}).get('stimulus_word', '') 
                               for r in analysis_results))
        response_words = list(set(r.get('raw_inputs', {}).get('response_word', '') 
                                for r in analysis_results))
        
        # P値のマトリックスを作成
        p_matrix = np.zeros((len(stimuli_words), len(response_words)))
        
        for result in analysis_results:
            raw_inputs = result.get('raw_inputs', {})
            stimulus = raw_inputs.get('stimulus_word', '')
            response = raw_inputs.get('response_word', '')
            p_value = result.get('p_value', 0)
            
            if stimulus in stimuli_words and response in response_words:
                i = stimuli_words.index(stimulus)
                j = response_words.index(response)
                p_matrix[i, j] = p_value
        
        # ヒートマップの作成
        fig = go.Figure(data=go.Heatmap(
            z=p_matrix,
            x=response_words,
            y=stimuli_words,
            colorscale='RdYlBu_r',
            colorbar=dict(title="Spirit Probability")
        ))
        
        fig.update_layout(
            title="Spirit Probability Heatmap (Stimulus vs Response)",
            xaxis_title="Response Words",
            yaxis_title="Stimulus Words",
            width=800,
            height=600
        )
        
        if save_path:
            fig.write_html(save_path)
            logging.info(f"Heatmap visualization saved to {save_path}")
        
        return fig

    def generate_analysis_report(self, run_id: str, analysis_results: List[Dict[str, Any]], 
                               output_path: str = "analysis_report.html"):
        """
        包括的な分析レポートを生成
        """
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Spirit in Physics - Analysis Report</title>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .section {{ margin: 30px 0; }}
                .metric {{ display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }}
                .metric h3 {{ margin: 0; color: #333; }}
                .metric .value {{ font-size: 24px; font-weight: bold; color: #007acc; }}
            </style>
        </head>
        <body>
            <h1>Spirit in Physics - Analysis Report</h1>
            <p><strong>Run ID:</strong> {run_id}</p>
            <p><strong>Generated:</strong> {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            
            <div class="section">
                <h2>Summary Metrics</h2>
                <div class="metric">
                    <h3>Total Responses</h3>
                    <div class="value">{len(analysis_results)}</div>
                </div>
                <div class="metric">
                    <h3>Average Spirit Probability</h3>
                    <div class="value">{np.mean([r.get('p_value', 0) for r in analysis_results]):.4f}</div>
                </div>
                <div class="metric">
                    <h3>Max Spirit Probability</h3>
                    <div class="value">{np.max([r.get('p_value', 0) for r in analysis_results]):.4f}</div>
                </div>
            </div>
            
            <div class="section">
                <h2>Spirit Vector Space (3D)</h2>
                <div id="spirit-3d-plot"></div>
            </div>
            
            <div class="section">
                <h2>Component Analysis</h2>
                <div id="component-plot"></div>
            </div>
            
            <div class="section">
                <h2>Detailed Results</h2>
                <table border="1" style="border-collapse: collapse; width: 100%;">
                    <tr>
                        <th>Stimulus</th>
                        <th>Response</th>
                        <th>Spirit Probability</th>
                        <th>Reaction Time (ms)</th>
                        <th>Skin Potential Δ</th>
                    </tr>
        """
        
        for result in analysis_results[:50]:  # 最初の50件のみ表示
            raw_inputs = result.get('raw_inputs', {})
            physio = raw_inputs.get('physiological_features', {})
            
            html_content += f"""
                    <tr>
                        <td>{raw_inputs.get('stimulus_word', '')}</td>
                        <td>{raw_inputs.get('response_word', '')}</td>
                        <td>{result.get('p_value', 0):.4f}</td>
                        <td>{raw_inputs.get('reaction_time_ms', 0)}</td>
                        <td>{physio.get('delta_sp', 0):.4f}</td>
                    </tr>
            """
        
        html_content += """
                </table>
            </div>
        </body>
        </html>
        """
        
        with open(os.path.join(self.output_dir, output_path), 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logging.info(f"Analysis report generated: {os.path.join(self.output_dir, output_path)}")

    def save_all_visualizations(self, run_id: str, analysis_results: List[Dict[str, Any]]):
        """
        すべての可視化を保存
        """
        base_path = f"run_{run_id}"
        
        # 3D Spiritベクトルプロット
        spirit_plot = self.create_spirit_vector_plot(analysis_results)
        if spirit_plot:
            spirit_plot.write_html(os.path.join(self.output_dir, f"{base_path}_spirit_vectors.html"))
        
        # 成分分析プロット
        component_plot = self.create_component_analysis_plot(analysis_results)
        if component_plot:
            component_plot.write_html(os.path.join(self.output_dir, f"{base_path}_components.html"))
        
        # ヒートマップ
        heatmap_plot = self.create_heatmap_visualization(analysis_results)
        if heatmap_plot:
            heatmap_plot.write_html(os.path.join(self.output_dir, f"{base_path}_heatmap.html"))
        
        # 分析レポート
        self.generate_analysis_report(run_id, analysis_results, f"{base_path}_report.html")
        
        logging.info(f"All visualizations saved for run {run_id}")

def main():
    """テスト用のメイン関数"""
    visualizer = SpiritVisualizer()
    
    # モックデータでテスト
    mock_results = [
        {
            "p_value": 0.8,
            "components": {"word2vec": 0.5, "reaction_time": 0.3, "skin_potential": 1.2, "emotion": 0.8},
            "raw_inputs": {
                "stimulus_word": "death",
                "response_word": "sad",
                "reaction_time_ms": 1200,
                "physiological_features": {"delta_sp": 0.5}
            }
        },
        {
            "p_value": 0.6,
            "components": {"word2vec": 0.3, "reaction_time": 0.4, "skin_potential": 0.8, "emotion": 0.9},
            "raw_inputs": {
                "stimulus_word": "angry",
                "response_word": "red",
                "reaction_time_ms": 900,
                "physiological_features": {"delta_sp": 0.3}
            }
        }
    ]
    
    # 可視化の生成
    visualizer.save_all_visualizations("test_run", mock_results)
    print("Visualizations generated in 'visualizations' directory")

if __name__ == '__main__':
    main()
