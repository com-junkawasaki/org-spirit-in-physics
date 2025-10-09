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

def create_participant_comparison(results):
    """Create participant comparison visualizations"""
    if not isinstance(results, dict) or 'participant_stats' not in results:
        print("参加者データが見つかりません。通常の結果ファイルを使用します。")
        return

    participant_stats = results['participant_stats']

    # Extract data for visualization
    participant_ids = [stat['participant_id'] for stat in participant_stats]
    avg_spirit_probs = [stat['avg_spirit_prob'] for stat in participant_stats]
    avg_reaction_times = [stat['avg_reaction_time'] for stat in participant_stats]
    num_responses = [stat['num_responses'] for stat in participant_stats]

    # Create comparison plot
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

    # Spirit probability comparison
    bars1 = ax1.bar(range(len(participant_ids)), avg_spirit_probs, alpha=0.7, color='skyblue')
    ax1.set_xlabel('Participants')
    ax1.set_ylabel('Average Spirit Probability')
    ax1.set_title('Average Spirit Probability by Participant')
    ax1.set_xticks(range(len(participant_ids)))
    ax1.set_xticklabels([f'P{i+1}' for i in range(len(participant_ids))], rotation=45)
    ax1.grid(True, alpha=0.3)

    # Add value labels on bars
    for bar, prob in zip(bars1, avg_spirit_probs):
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height,
                f'{prob".3f"}', ha='center', va='bottom')

    # Reaction time comparison
    bars2 = ax2.bar(range(len(participant_ids)), avg_reaction_times, alpha=0.7, color='lightcoral')
    ax2.set_xlabel('Participants')
    ax2.set_ylabel('Average Reaction Time (ms)')
    ax2.set_title('Average Reaction Time by Participant')
    ax2.set_xticks(range(len(participant_ids)))
    ax2.set_xticklabels([f'P{i+1}' for i in range(len(participant_ids))], rotation=45)
    ax2.grid(True, alpha=0.3)

    # Add value labels on bars
    for bar, time in zip(bars2, avg_reaction_times):
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height,
                f'{time".0f"}', ha='center', va='bottom')

    plt.tight_layout()
    plt.savefig('participant_comparison.png', dpi=300, bbox_inches='tight')
    plt.show()

    # Create scatter plot: Spirit prob vs Reaction time
    plt.figure(figsize=(10, 6))
    scatter = plt.scatter(avg_reaction_times, avg_spirit_probs, s=[n*10 for n in num_responses],
                         alpha=0.6, c=avg_spirit_probs, cmap='viridis')

    # Add participant labels
    for i, (rt, sp) in enumerate(zip(avg_reaction_times, avg_spirit_probs)):
        plt.annotate(f'P{i+1}', (rt, sp), xytext=(5, 5), textcoords='offset points')

    plt.xlabel('Average Reaction Time (ms)')
    plt.ylabel('Average Spirit Probability')
    plt.title('Spirit Probability vs Reaction Time by Participant')
    plt.colorbar(scatter, label='Spirit Probability')
    plt.grid(True, alpha=0.3)
    plt.savefig('participant_spirit_vs_reaction.png', dpi=300, bbox_inches='tight')
    plt.show()

def create_participant_detailed_report(results, output_file="participant_detailed_report.html"):
    """Create detailed HTML report for participant analysis"""

    if not isinstance(results, dict) or 'participant_stats' not in results:
        print("参加者データが見つかりません。通常の結果ファイルを使用します。")
        return

    participant_stats = results['participant_stats']
    overall_stats = results.get('overall_stats', {})
    participants_info = results.get('participants_info', {})

    # Calculate additional metrics
    spirit_probs = [stat['avg_spirit_prob'] for stat in participant_stats]
    reaction_times = [stat['avg_reaction_time'] for stat in participant_stats]

    # Create HTML content
    html_content = f"""
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Spirit in Physics - 参加者別詳細レポート</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background-color: #f8f9fa; }}
            .container {{ max-width: 1400px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }}
            h1, h2, h3 {{ color: #333; }}
            .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }}
            .summary-card {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }}
            .summary-value {{ font-size: 2em; font-weight: bold; margin: 10px 0; }}
            .summary-label {{ font-size: 0.9em; opacity: 0.9; }}
            .participant-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .participant-table th, .participant-table td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
            .participant-table th {{ background-color: #f2f2f2; font-weight: bold; }}
            .participant-table tr:nth-child(even) {{ background-color: #f9f9f9; }}
            .high-spirit {{ background-color: #d4edda; }}
            .section {{ margin: 30px 0; }}
            img {{ max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 40px; color: #666; font-size: 0.9em; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧠 Spirit in Physics - 参加者別詳細レポート</h1>
            <p>被験者ごとの川崎モデル解析結果</p>

            <div class="summary">
                <div class="summary-card">
                    <div class="summary-value">{overall_stats.get('total_participants', 0)}</div>
                    <div class="summary-label">総参加者数</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">{overall_stats.get('total_responses', 0)}</div>
                    <div class="summary-label">総応答数</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">{overall_stats.get('avg_spirit_prob', 0)".4f"}</div>
                    <div class="summary-label">全体平均Spirit確率</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">{overall_stats.get('max_spirit_prob', 0)".4f"}</div>
                    <div class="summary-label">最高Spirit確率</div>
                </div>
            </div>

            <div class="section">
                <h2>📊 参加者別統計表</h2>
                <table class="participant-table">
                    <thead>
                        <tr>
                            <th>順位</th>
                            <th>参加者ID</th>
                            <th>年齢・性別</th>
                            <th>応答数</th>
                            <th>平均Spirit確率</th>
                            <th>標準偏差</th>
                            <th>平均反応時間(ms)</th>
                            <th>刺激語種類数</th>
                            <th>応答語種類数</th>
                        </tr>
                    </thead>
                    <tbody>
    """

    # Sort participants by spirit probability
    sorted_stats = sorted(participant_stats, key=lambda x: x['avg_spirit_prob'], reverse=True)

    for i, stats in enumerate(sorted_stats, 1):
        pid = stats['participant_id']
        info = participants_info.get(pid, {})
        age = info.get('age', 'N/A')
        gender = info.get('gender', 'N/A')

        # Highlight high performers
        row_class = 'high-spirit' if stats['avg_spirit_prob'] > np.mean(spirit_probs) + np.std(spirit_probs) else ''

        html_content += f"""
                        <tr class="{row_class}">
                            <td>{i}</td>
                            <td>{pid}</td>
                            <td>{age}歳・{gender}</td>
                            <td>{stats['num_responses']}</td>
                            <td>{stats['avg_spirit_prob']".4f"}</td>
                            <td>{stats['spirit_std']".4f"}</td>
                            <td>{stats['avg_reaction_time']".0f"}</td>
                            <td>{stats['unique_stimulus_words']}</td>
                            <td>{stats['unique_response_words']}</td>
                        </tr>
        """

    html_content += """
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h2>📈 可視化結果</h2>

                <h3>参加者別Spirit確率比較</h3>
                <img src="participant_comparison.png" alt="Participant Spirit Probability Comparison">

                <h3>反応時間 vs Spirit確率（参加者別）</h3>
                <img src="participant_spirit_vs_reaction.png" alt="Participant Spirit vs Reaction Time">
            </div>

            <div class="section">
                <h2>🏆 高性能参加者</h2>
                <p>Spirit確率の高い上位参加者:</p>
                <ol>
    "

    # Add top 3 participants
    top_3 = sorted_stats[:3]
    for i, stats in enumerate(top_3, 1):
        pid = stats['participant_id']
        info = participants_info.get(pid, {})
        age = info.get('age', 'N/A')
        gender = info.get('gender', 'N/A')

        html_content += f"<li><strong>参加者 {pid}</strong> ({age}歳・{gender}) - Spirit確率: {stats['avg_spirit_prob']:.4f}</li>"

    html_content += f"""
                </ol>
            </div>

            <div class="footer">
                <p>Spirit in Physics プロジェクト - 参加者別詳細分析レポート</p>
                <p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Write HTML file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"参加者詳細レポートを生成しました: {output_file}")

def main():
    print("=== Spirit in Physics - Results Visualization ===")

    # Find the latest results file (both simple and participant analysis)
    results_dir = "/Users/junkawasaki/jun784/spirit-in-physics/apps/analyzer"
    results_files = [f for f in os.listdir(results_dir) if
                    (f.startswith("simple_analysis_results_") or f.startswith("participant_analysis_results_"))
                    and f.endswith(".json")]

    if not results_files:
        print("分析結果ファイルが見つかりません。先に分析を実行してください。")
        return

    # Get the latest results file
    latest_file = max(results_files, key=lambda x: os.path.getctime(os.path.join(results_dir, x)))
    results_path = os.path.join(results_dir, latest_file)

    print(f"結果ファイル: {results_path}")

    # Load results
    results = load_results(results_path)
    print(f"読み込んだ結果: {len(results) if isinstance(results, list) else '参加者データ形式'}")

    # Generate visualizations
    print("可視化を生成中...")

    if isinstance(results, list):
        # Legacy simple analysis results
        create_spirit_probability_distribution(results)
        create_reaction_time_vs_spirit_scatter(results)
        create_word_length_analysis(results)

        # Generate HTML report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        html_file = f"spirit_analysis_report_{timestamp}.html"
        generate_html_report(results, html_file)
    else:
        # New participant analysis results
        create_participant_comparison(results)

        # Generate detailed participant report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        html_file = f"participant_detailed_report_{timestamp}.html"
        create_participant_detailed_report(results, html_file)

    print("可視化が完了しました！")
    print("生成されたファイル:")
    if isinstance(results, list):
        print("  - spirit_probability_distribution.png")
        print("  - reaction_time_vs_spirit.png")
        print("  - word_length_analysis.png")
        print(f"  - {html_file}")
    else:
        print("  - participant_comparison.png")
        print("  - participant_spirit_vs_reaction.png")
        print(f"  - {html_file}")

if __name__ == "__main__":
    main()
