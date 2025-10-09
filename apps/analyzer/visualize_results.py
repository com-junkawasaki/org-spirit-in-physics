#!/usr/bin/env python3
"""
Visualization script for Spirit in Physics analysis results
"""

import json
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from datetime import datetime
import os

def load_results(filename):
    """Load analysis results from JSON file"""
    with open(filename, 'r', encoding='utf-8') as f:
        return json.load(f)

def create_spirit_probability_distribution(results):
    """Create histogram of spirit probabilities"""
    spirit_probs = [r['spirit_probability'] for r in results]

    plt.figure(figsize=(10, 6))
    plt.hist(spirit_probs, bins=20, alpha=0.7, edgecolor='black')
    plt.xlabel('Spirit Probability')
    plt.ylabel('Frequency')
    plt.title('Distribution of Spirit Probabilities')
    plt.grid(True, alpha=0.3)
    plt.savefig('spirit_probability_distribution.png', dpi=300, bbox_inches='tight')
    plt.show()

def create_reaction_time_vs_spirit_scatter(results):
    """Create scatter plot of reaction time vs spirit probability"""
    reaction_times = [r['reaction_time_ms'] for r in results]
    spirit_probs = [r['spirit_probability'] for r in results]

    plt.figure(figsize=(10, 6))
    plt.scatter(reaction_times, spirit_probs, alpha=0.6)
    plt.xlabel('Reaction Time (ms)')
    plt.ylabel('Spirit Probability')
    plt.title('Reaction Time vs Spirit Probability')
    plt.grid(True, alpha=0.3)

    # Add trend line
    z = np.polyfit(reaction_times, spirit_probs, 1)
    p = np.poly1d(z)
    plt.plot(reaction_times, p(reaction_times), "r--", alpha=0.8, label=f'Trend line (slope: {z[0]:.4f})')
    plt.legend()

    plt.savefig('reaction_time_vs_spirit.png', dpi=300, bbox_inches='tight')
    plt.show()

def create_word_length_analysis(results):
    """Analyze relationship between word length and spirit probability"""
    stimulus_lengths = [len(r['stimulus_word']) for r in results]
    response_lengths = [len(r['response_word']) for r in results]
    spirit_probs = [r['spirit_probability'] for r in results]

    plt.figure(figsize=(12, 5))

    plt.subplot(1, 2, 1)
    plt.scatter(stimulus_lengths, spirit_probs, alpha=0.6, label='Stimulus')
    plt.scatter(response_lengths, spirit_probs, alpha=0.6, label='Response')
    plt.xlabel('Word Length')
    plt.ylabel('Spirit Probability')
    plt.title('Word Length vs Spirit Probability')
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    length_diffs = [abs(len(r['stimulus_word']) - len(r['response_word'])) for r in results]
    plt.scatter(length_diffs, spirit_probs, alpha=0.6)
    plt.xlabel('Absolute Length Difference')
    plt.ylabel('Spirit Probability')
    plt.title('Length Difference vs Spirit Probability')
    plt.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('word_length_analysis.png', dpi=300, bbox_inches='tight')
    plt.show()

def create_top_spirit_words(results, top_n=10):
    """Show top N words with highest spirit probabilities"""
    # Group by stimulus word and calculate average spirit probability
    word_stats = {}
    for r in results:
        word = r['stimulus_word']
        if word not in word_stats:
            word_stats[word] = {'probabilities': [], 'responses': []}
        word_stats[word]['probabilities'].append(r['spirit_probability'])
        word_stats[word]['responses'].append(r['response_word'])

    # Calculate averages
    word_averages = []
    for word, stats in word_stats.items():
        avg_prob = np.mean(stats['probabilities'])
        word_averages.append({
            'word': word,
            'avg_spirit_prob': avg_prob,
            'num_responses': len(stats['probabilities']),
            'sample_responses': stats['responses'][:3]  # First 3 responses
        })

    # Sort by average spirit probability
    word_averages.sort(key=lambda x: x['avg_spirit_prob'], reverse=True)

    print("Top Spirit Words:")
    print("=" * 50)
    for i, item in enumerate(word_averages[:top_n]):
        print(f"{i+1:2d}. {item['word']} (平均Spirit確率: {item['avg_spirit_prob']:.4f}, 応答数: {item['num_responses']})")
        print(f"    サンプル応答: {', '.join(item['sample_responses'])}")

    return word_averages[:top_n]

def generate_html_report(results, output_file="spirit_analysis_report.html"):
    """Generate HTML report with visualizations and statistics"""

    # Calculate statistics
    spirit_probs = [r['spirit_probability'] for r in results]
    reaction_times = [r['reaction_time_ms'] for r in results]

    avg_spirit = np.mean(spirit_probs)
    max_spirit = np.max(spirit_probs)
    min_spirit = np.min(spirit_probs)
    avg_reaction = np.mean(reaction_times)

    # Create HTML content
    html_content = f"""
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Spirit in Physics - Analysis Report</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background-color: #f5f5f5; }}
            .container {{ max-width: 1200px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }}
            h1, h2 {{ color: #333; }}
            .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }}
            .stat-card {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }}
            .stat-value {{ font-size: 2em; font-weight: bold; margin: 10px 0; }}
            .stat-label {{ font-size: 0.9em; opacity: 0.9; }}
            .section {{ margin: 30px 0; }}
            img {{ max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 40px; color: #666; font-size: 0.9em; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧠 Spirit in Physics - 分析レポート</h1>
            <p>川崎モデルによる霊性解析結果</p>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">{avg_spirit:.4f}</div>
                    <div class="stat-label">平均Spirit確率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{max_spirit:.4f}</div>
                    <div class="stat-label">最高Spirit確率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{min_spirit:.4f}</div>
                    <div class="stat-label">最低Spirit確率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{avg_reaction:.0f}ms</div>
                    <div class="stat-label">平均反応時間</div>
                </div>
            </div>

            <div class="section">
                <h2>📊 分析結果の概要</h2>
                <p>総解析件数: {len(results)}件の単語連合データ</p>
                <p>解析日時: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}</p>
            </div>

            <div class="section">
                <h2>📈 可視化結果</h2>

                <h3>Spirit確率分布</h3>
                <img src="spirit_probability_distribution.png" alt="Spirit Probability Distribution">

                <h3>反応時間 vs Spirit確率</h3>
                <img src="reaction_time_vs_spirit.png" alt="Reaction Time vs Spirit Probability">

                <h3>単語長分析</h3>
                <img src="word_length_analysis.png" alt="Word Length Analysis">
            </div>

            <div class="section">
                <h2>🏆 高Spirit確率単語トップ10</h2>
                <p>平均Spirit確率の高い刺激語ランキング:</p>
    """

    # Add top words
    word_averages = create_top_spirit_words(results, 10)
    html_content += "<ol>"
    for item in word_averages:
        html_content += f"<li><strong>{item['word']}</strong> (平均Spirit確率: {item['avg_spirit_prob']:.4f})</li>"
    html_content += "</ol>"

    html_content += f"""
            </div>

            <div class="footer">
                <p>Spirit in Physics プロジェクト - 科学的手法による霊性測定システム</p>
                <p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Write HTML file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"HTMLレポートを生成しました: {output_file}")

def main():
    print("=== Spirit in Physics - Results Visualization ===")

    # Find the latest results file
    results_dir = "/Users/junkawasaki/jun784/spirit-in-physics/apps/analyzer"
    results_files = [f for f in os.listdir(results_dir) if f.startswith("simple_analysis_results_") and f.endswith(".json")]

    if not results_files:
        print("分析結果ファイルが見つかりません。先に分析を実行してください。")
        return

    # Get the latest results file
    latest_file = max(results_files, key=lambda x: os.path.getctime(os.path.join(results_dir, x)))
    results_path = os.path.join(results_dir, latest_file)

    print(f"結果ファイル: {results_path}")

    # Load results
    results = load_results(results_path)
    print(f"読み込んだ結果: {len(results)}件")

    # Generate visualizations
    print("可視化を生成中...")
    create_spirit_probability_distribution(results)
    create_reaction_time_vs_spirit_scatter(results)
    create_word_length_analysis(results)

    # Generate HTML report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    html_file = f"spirit_analysis_report_{timestamp}.html"
    generate_html_report(results, html_file)

    print("可視化が完了しました！")
    print("生成されたファイル:")
    print(f"  - spirit_probability_distribution.png")
    print(f"  - reaction_time_vs_spirit.png")
    print(f"  - word_length_analysis.png")
    print(f"  - {html_file}")

if __name__ == "__main__":
    main()
