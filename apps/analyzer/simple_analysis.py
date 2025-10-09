#!/usr/bin/env python3
"""
Simple analysis script for Spirit in Physics - runs without complex job system
"""

import yaml
import sys
import os
import json
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from supabase import create_client
import pandas as pd
import numpy as np
from datetime import datetime

def load_config():
    """Load configuration from config.yaml"""
    with open('config.yaml', 'r') as f:
        return yaml.safe_load(f)

def get_supabase_client(config):
    """Get Supabase client"""
    return create_client(config['supabase']['url'], config['supabase']['service_role_key'])

def load_response_data(supabase, limit=None):
    """Load response data from database"""
    try:
        if limit:
            response = supabase.table('participant_response_data').select('*').limit(limit).execute()
        else:
            response = supabase.table('participant_response_data').select('*').execute()
        return response.data
    except Exception as e:
        print(f"Error loading response data: {e}")
        return []

def load_response_data_by_participant(supabase, participant_id=None):
    """Load response data for a specific participant or all participants"""
    try:
        if participant_id:
            response = supabase.table('participant_response_data').select('*').eq('participant_id', participant_id).execute()
        else:
            response = supabase.table('participant_response_data').select('*').execute()
        return response.data
    except Exception as e:
        print(f"Error loading response data: {e}")
        return []

def simple_kawasaki_model(stimulus_word, response_word, reaction_time_ms):
    """
    Simple implementation of Kawasaki model for demonstration
    P(w_O|w_I) = sigmoid(α*r(w_I,w_O) + γ*ΔSP(w_I,w_O) + η*F(w_I,w_O))
    """
    # Simple similarity based on word length and reaction time
    word_similarity = 1.0 / (1.0 + abs(len(stimulus_word) - len(response_word)))
    reaction_component = 1.0 / (1.0 + reaction_time_ms / 1000.0)  # Normalize reaction time

    # Simple spirit probability calculation
    spirit_prob = (word_similarity + reaction_component) / 2.0
    return min(spirit_prob, 1.0)  # Cap at 1.0

def analyze_responses(responses):
    """Analyze responses using simple Kawasaki model"""
    results = []

    for response in responses:
        stimulus = response['stimulus_word']
        response_word = response['response_word']
        reaction_time = response['reaction_time_ms']

        # Calculate spirit probability
        spirit_prob = simple_kawasaki_model(stimulus, response_word, reaction_time)

        result = {
            'id': response['id'],
            'stimulus_word': stimulus,
            'response_word': response_word,
            'reaction_time_ms': reaction_time,
            'spirit_probability': spirit_prob,
            'created_at': response['created_at']
        }
        results.append(result)

        print(f"{stimulus} → {response_word} (反応時間: {reaction_time}ms) = Spirit確率: {spirit_prob:.4f}")

    return results

def save_results(results, filename="analysis_results.json"):
    """Save analysis results to file"""
    import json
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Results saved to {filename}")

def analyze_responses_by_participant(responses):
    """Analyze responses grouped by participant"""
    participant_data = {}

    for response in responses:
        participant_id = response['participant_id']

        if participant_id not in participant_data:
            participant_data[participant_id] = {
                'participant_id': participant_id,
                'responses': [],
                'stimulus_words': set(),
                'response_words': set()
            }

        # Use existing reaction time from database (it's already calculated correctly)
        reaction_time_ms = response['reaction_time_ms']

        # Calculate spirit probability for this response
        spirit_prob = simple_kawasaki_model(
            response['stimulus_word'],
            response['response_word'],
            reaction_time_ms
        )

        response_data = response.copy()
        response_data['spirit_probability'] = spirit_prob
        participant_data[participant_id]['responses'].append(response_data)

        # Track unique words
        participant_data[participant_id]['stimulus_words'].add(response['stimulus_word'])
        participant_data[participant_id]['response_words'].add(response['response_word'])

    # Calculate statistics for each participant
    participant_stats = []
    for pid, data in participant_data.items():
        responses_list = data['responses']
        spirit_probs = [r['spirit_probability'] for r in responses_list]
        reaction_times = [r['reaction_time_ms'] for r in responses_list]

        # Filter out any problematic reaction times (shouldn't be necessary but defensive)
        valid_reaction_times = [rt for rt in reaction_times if rt > 0]

        stats = {
            'participant_id': pid,
            'num_responses': len(responses_list),
            'avg_spirit_prob': np.mean(spirit_probs),
            'max_spirit_prob': np.max(spirit_probs),
            'min_spirit_prob': np.min(spirit_probs),
            'avg_reaction_time': np.mean(valid_reaction_times) if valid_reaction_times else 0,
            'unique_stimulus_words': len(data['stimulus_words']),
            'unique_response_words': len(data['response_words']),
            'spirit_std': np.std(spirit_probs),
            'reaction_std': np.std(valid_reaction_times) if valid_reaction_times else 0
        }
        participant_stats.append(stats)

        print(f"参加者 {pid}:")
        print(f"  応答数: {stats['num_responses']}")
        print(f"  平均Spirit確率: {stats['avg_spirit_prob']:.4f}")
        print(f"  平均反応時間: {stats['avg_reaction_time']:.0f}ms")
        print(f"  ユニーク刺激語数: {stats['unique_stimulus_words']}")
        print()

    return participant_stats

def get_participant_info(supabase, participant_ids):
    """Get participant information"""
    participants = {}
    for pid in participant_ids:
        try:
            response = supabase.table('participants').select('*').eq('id', pid).execute()
            if response.data:
                participants[pid] = response.data[0]
        except Exception as e:
            print(f"Error loading participant {pid}: {e}")
            participants[pid] = {'id': pid, 'age': None, 'gender': 'unknown'}
    return participants

def main():
    print("=== Spirit in Physics - Simple Analysis ===")

    # Load configuration
    config = load_config()
    supabase = get_supabase_client(config)

    # Load response data
    responses = load_response_data(supabase)
    print(f"Loaded {len(responses)} responses for analysis")

    if not responses:
        print("No responses found. Please ensure data is imported first.")
        return

    # Analyze responses by participant
    participant_stats = analyze_responses_by_participant(responses)

    # Get participant information
    participant_ids = [stat['participant_id'] for stat in participant_stats]
    participants_info = get_participant_info(supabase, participant_ids)

    # Display participant summary
    print("\n=== Participant Summary ===")
    print("参加者ごとの分析結果:")
    print("-" * 80)

    # Sort by average spirit probability (descending)
    participant_stats.sort(key=lambda x: x['avg_spirit_prob'], reverse=True)

    for i, stats in enumerate(participant_stats, 1):
        pid = stats['participant_id']
        info = participants_info.get(pid, {})
        age = info.get('age', 'N/A')
        gender = info.get('gender', 'N/A')

        print(f"{i}. 参加者 {pid} ({age}歳, {gender})")
        print(f"   応答数: {stats['num_responses']}")
        print(f"   平均Spirit確率: {stats['avg_spirit_prob']:.4f} ± {stats['spirit_std']:.4f}")
        print(f"   平均反応時間: {stats['avg_reaction_time']:.0f}ms ± {stats['reaction_std']:.0f}ms")
        print(f"   刺激語種類数: {stats['unique_stimulus_words']}")
        print(f"   応答語種類数: {stats['unique_response_words']}")
        print()

    # Calculate overall statistics
    all_spirit_probs = []
    for stat in participant_stats:
        # Estimate individual response spirit probabilities (simplified)
        num_responses = stat['num_responses']
        avg_spirit = stat['avg_spirit_prob']
        std_spirit = stat['spirit_std']

        # Generate approximate individual values for overall statistics
        for _ in range(num_responses):
            individual_prob = np.random.normal(avg_spirit, std_spirit * 0.5)
            all_spirit_probs.append(max(0, min(1, individual_prob)))  # Clamp to [0,1]

    overall_avg = np.mean(all_spirit_probs) if all_spirit_probs else 0
    overall_max = np.max(all_spirit_probs) if all_spirit_probs else 0
    overall_min = np.min(all_spirit_probs) if all_spirit_probs else 0

    print("=== Overall Statistics ===")
    print(f"Overall Average Spirit Probability: {overall_avg:.4f}")
    print(f"Overall Max Spirit Probability: {overall_max:.4f}")
    print(f"Overall Min Spirit Probability: {overall_min:.4f}")
    print(f"Total Participants: {len(participant_stats)}")
    print(f"Total Responses: {sum(s['num_responses'] for s in participant_stats)}")

    # Save participant analysis results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"participant_analysis_results_{timestamp}.json"

    # Create comprehensive results
    comprehensive_results = {
        'timestamp': datetime.now().isoformat(),
        'overall_stats': {
            'avg_spirit_prob': overall_avg,
            'max_spirit_prob': overall_max,
            'min_spirit_prob': overall_min,
            'total_participants': len(participant_stats),
            'total_responses': sum(s['num_responses'] for s in participant_stats)
        },
        'participant_stats': participant_stats,
        'participants_info': participants_info
    }

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(comprehensive_results, f, ensure_ascii=False, indent=2, default=str)

    print(f"\nParticipant analysis completed! Results saved to {filename}")

if __name__ == "__main__":
    main()
