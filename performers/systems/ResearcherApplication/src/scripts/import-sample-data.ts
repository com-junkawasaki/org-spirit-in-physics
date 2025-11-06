#!/usr/bin/env tsx
/**
 * Sample data import script for participant analysis results
 * 
 * Usage:
 *   tsx scripts/import-sample-data.ts <participantId>
 * 
 * Example:
 *   tsx scripts/import-sample-data.ts e41a9cd2-d803-49a8-9020-0260e55cd03e
 */

const participantId = process.argv[2] || 'e41a9cd2-d803-49a8-9020-0260e55cd03e';
const experimentId = '00000000-0000-0000-0000-000000000000'; // Default experiment UUID
const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Sample analysis results data
const sampleResults = [
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 1,
    stimulus_word: '愛',
    response_word: '平和',
    reaction_time_ms: 1200,
    spirit_probability: 0.85,
    word2vec_component: 0.3,
    reaction_time_component: 0.2,
    skin_potential_component: 0.1,
    emotion_component: 0.25,
    emotion_data: { joy: 0.8, sadness: 0.1 },
    physiological_data: { gsr: 2.3 }
  },
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 2,
    stimulus_word: '憎しみ',
    response_word: '怒り',
    reaction_time_ms: 950,
    spirit_probability: 0.72,
    word2vec_component: 0.2,
    reaction_time_component: 0.15,
    skin_potential_component: 0.12,
    emotion_component: 0.25,
    emotion_data: { anger: 0.7, fear: 0.2 },
    physiological_data: { gsr: 3.1 }
  },
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 3,
    stimulus_word: '希望',
    response_word: '未来',
    reaction_time_ms: 1100,
    spirit_probability: 0.78,
    word2vec_component: 0.35,
    reaction_time_component: 0.18,
    skin_potential_component: 0.08,
    emotion_component: 0.22,
    emotion_data: { joy: 0.75, surprise: 0.15 },
    physiological_data: { gsr: 2.1 }
  },
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 4,
    stimulus_word: '絶望',
    response_word: '暗闇',
    reaction_time_ms: 1300,
    spirit_probability: 0.65,
    word2vec_component: 0.15,
    reaction_time_component: 0.12,
    skin_potential_component: 0.15,
    emotion_component: 0.28,
    emotion_data: { sadness: 0.8, fear: 0.2 },
    physiological_data: { gsr: 3.5 }
  },
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 5,
    stimulus_word: '喜び',
    response_word: '笑顔',
    reaction_time_ms: 800,
    spirit_probability: 0.88,
    word2vec_component: 0.4,
    reaction_time_component: 0.25,
    skin_potential_component: 0.05,
    emotion_component: 0.2,
    emotion_data: { joy: 0.9, surprise: 0.1 },
    physiological_data: { gsr: 1.8 }
  },
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 6,
    stimulus_word: '悲しみ',
    response_word: '涙',
    reaction_time_ms: 1400,
    spirit_probability: 0.68,
    word2vec_component: 0.18,
    reaction_time_component: 0.1,
    skin_potential_component: 0.18,
    emotion_component: 0.3,
    emotion_data: { sadness: 0.85, fear: 0.15 },
    physiological_data: { gsr: 3.8 }
  },
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 7,
    stimulus_word: '自由',
    response_word: '空',
    reaction_time_ms: 1000,
    spirit_probability: 0.82,
    word2vec_component: 0.32,
    reaction_time_component: 0.2,
    skin_potential_component: 0.06,
    emotion_component: 0.18,
    emotion_data: { joy: 0.7, surprise: 0.2 },
    physiological_data: { gsr: 2.0 }
  },
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 8,
    stimulus_word: '束縛',
    response_word: '牢獄',
    reaction_time_ms: 1500,
    spirit_probability: 0.62,
    word2vec_component: 0.12,
    reaction_time_component: 0.08,
    skin_potential_component: 0.2,
    emotion_component: 0.32,
    emotion_data: { anger: 0.6, fear: 0.3 },
    physiological_data: { gsr: 4.0 }
  },
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 9,
    stimulus_word: '光',
    response_word: '太陽',
    reaction_time_ms: 900,
    spirit_probability: 0.86,
    word2vec_component: 0.38,
    reaction_time_component: 0.22,
    skin_potential_component: 0.04,
    emotion_component: 0.16,
    emotion_data: { joy: 0.8, surprise: 0.15 },
    physiological_data: { gsr: 1.9 }
  },
  {
    participant_id: participantId,
    experiment_id: experimentId,
    word_stimulus_id: 10,
    stimulus_word: '闇',
    response_word: '夜',
    reaction_time_ms: 1200,
    spirit_probability: 0.7,
    word2vec_component: 0.2,
    reaction_time_component: 0.15,
    skin_potential_component: 0.14,
    emotion_component: 0.26,
    emotion_data: { sadness: 0.6, fear: 0.3 },
    physiological_data: { gsr: 3.2 }
  }
];

async function importData() {
  try {
    console.log(`Importing ${sampleResults.length} analysis results for participant: ${participantId}`);
    console.log(`API URL: ${apiUrl}/api/analysis-results/import`);

    // Use node-fetch or native fetch with custom agent for self-signed certs
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participantId,
        results: sampleResults,
      }),
    };

    // For Node.js, we need to handle self-signed certificates
    // In browser, this is not needed
    if (typeof process !== 'undefined' && process.env) {
      // Set NODE_TLS_REJECT_UNAUTHORIZED=0 for self-signed certs (development only)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const response = await fetch(`${apiUrl}/api/analysis-results/import`, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('Import successful!');
    console.log(`Imported ${result.count} analysis results`);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Failed to import data:', error);
    process.exit(1);
  }
}

importData();

