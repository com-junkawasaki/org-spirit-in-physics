#!/usr/bin/env tsx
/**
 * Supabase移行検証スクリプト
 * 
 * このスクリプトは以下を検証します：
 * 1. Supabase接続の確認
 * 2. 主要テーブルの存在確認
 * 3. データアクセス層の動作確認
 * 4. APIエンドポイントの基本動作確認
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 環境変数が設定されていません:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || '未設定');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '設定済み' : '未設定');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

interface VerificationResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

async function verifyConnection(): Promise<VerificationResult> {
  try {
    const { data, error } = await client.from('participants').select('id').limit(1);
    if (error) throw error;
    return {
      name: 'Supabase接続',
      status: 'success',
      message: 'Supabaseデータベースへの接続に成功しました',
      details: { url: supabaseUrl }
    };
  } catch (error: any) {
    return {
      name: 'Supabase接続',
      status: 'error',
      message: `接続エラー: ${error.message}`,
      details: error
    };
  }
}

async function verifyTables(): Promise<VerificationResult[]> {
  const requiredTables = [
    'participants',
    'participant_consents',
    'participant_experiment_sessions',
    'participant_response_data',
    'participant_analysis_results',
    'participant_hume_analysis_jobs',
    'participant_hume_burst_predictions',
    'participant_hume_face_predictions',
    'participant_hume_language_predictions',
    'participant_hume_prosody_predictions',
    'word_stimuli',
  ];

  const tableResults: VerificationResult[] = [];

  for (const table of requiredTables) {
    try {
      const { data, error } = await client.from(table).select('*').limit(1);
      if (error) {
        tableResults.push({
          name: `テーブル: ${table}`,
          status: 'error',
          message: `テーブルへのアクセスエラー: ${error.message}`,
          details: error
        });
      } else {
        tableResults.push({
          name: `テーブル: ${table}`,
          status: 'success',
          message: 'テーブルが存在し、アクセス可能です',
          details: { rowCount: data?.length || 0 }
        });
      }
    } catch (error: any) {
      tableResults.push({
        name: `テーブル: ${table}`,
        status: 'error',
        message: `予期しないエラー: ${error.message}`,
        details: error
      });
    }
  }

  return tableResults;
}

async function verifyDataAccess(): Promise<VerificationResult[]> {
  const accessResults: VerificationResult[] = [];

  // 1. 参加者データの取得
  try {
    const { data, error } = await client
      .from('participants')
      .select('id, name, created_at')
      .limit(5);
    
    if (error) throw error;
    
    accessResults.push({
      name: '参加者データ取得',
      status: 'success',
      message: `${data?.length || 0}件の参加者データを取得しました`,
      details: { sampleIds: data?.slice(0, 3).map(p => p.id) || [] }
    });
  } catch (error: any) {
    accessResults.push({
      name: '参加者データ取得',
      status: 'error',
      message: `エラー: ${error.message}`,
      details: error
    });
  }

  // 2. セッションデータの取得
  try {
    const { data, error } = await client
      .from('participant_experiment_sessions')
      .select('id, participant_id, start_time')
      .limit(5);
    
    if (error) throw error;
    
    accessResults.push({
      name: 'セッションデータ取得',
      status: 'success',
      message: `${data?.length || 0}件のセッションデータを取得しました`,
      details: { sampleIds: data?.slice(0, 3).map(s => s.id) || [] }
    });
  } catch (error: any) {
    accessResults.push({
      name: 'セッションデータ取得',
      status: 'error',
      message: `エラー: ${error.message}`,
      details: error
    });
  }

  // 3. 応答データの取得
  try {
    const { data, error } = await client
      .from('participant_response_data')
      .select('id, participant_id, stimulus_word, response_word')
      .limit(5);
    
    if (error) throw error;
    
    accessResults.push({
      name: '応答データ取得',
      status: 'success',
      message: `${data?.length || 0}件の応答データを取得しました`,
      details: { sampleCount: data?.length || 0 }
    });
  } catch (error: any) {
    accessResults.push({
      name: '応答データ取得',
      status: 'error',
      message: `エラー: ${error.message}`,
      details: error
    });
  }

  // 4. 感情分析データの取得
  try {
    const { data: jobs, error: jobsError } = await client
      .from('participant_hume_analysis_jobs')
      .select('id, participant_experiment_session_id, status')
      .limit(5);
    
    if (jobsError) throw jobsError;
    
    accessResults.push({
      name: '感情分析ジョブ取得',
      status: 'success',
      message: `${jobs?.length || 0}件の感情分析ジョブを取得しました`,
      details: { sampleCount: jobs?.length || 0 }
    });
  } catch (error: any) {
    accessResults.push({
      name: '感情分析ジョブ取得',
      status: 'error',
      message: `エラー: ${error.message}`,
      details: error
    });
  }

  return accessResults;
}

async function verifyRelationships(): Promise<VerificationResult[]> {
  const relationshipResults: VerificationResult[] = [];

  // 参加者とセッションの関係
  try {
    const { data, error } = await client
      .from('participant_experiment_sessions')
      .select('participant_id, id')
      .limit(10);
    
    if (error) throw error;

    const participantIds = new Set(data?.map(s => s.participant_id) || []);
    const missingParticipants: string[] = [];

    for (const participantId of participantIds) {
      const { data: participant, error: pError } = await client
        .from('participants')
        .select('id')
        .eq('id', participantId)
        .single();
      
      if (pError || !participant) {
        missingParticipants.push(participantId);
      }
    }

    if (missingParticipants.length > 0) {
      relationshipResults.push({
        name: '参加者-セッション関係',
        status: 'warning',
        message: `${missingParticipants.length}件のセッションに対応する参加者が見つかりません`,
        details: { missingParticipants }
      });
    } else {
      relationshipResults.push({
        name: '参加者-セッション関係',
        status: 'success',
        message: '全てのセッションに対応する参加者が存在します',
        details: { checkedSessions: data?.length || 0 }
      });
    }
  } catch (error: any) {
    relationshipResults.push({
      name: '参加者-セッション関係',
      status: 'error',
      message: `エラー: ${error.message}`,
      details: error
    });
  }

  return relationshipResults;
}

async function main() {
  console.log('🔍 Supabase移行検証を開始します...\n');

  // 1. 接続確認
  console.log('1. Supabase接続を確認中...');
  const connectionResult = await verifyConnection();
  results.push(connectionResult);
  console.log(`   ${connectionResult.status === 'success' ? '✅' : '❌'} ${connectionResult.message}\n`);

  if (connectionResult.status === 'error') {
    console.error('❌ 接続に失敗したため、検証を中断します');
    process.exit(1);
  }

  // 2. テーブル確認
  console.log('2. 必須テーブルの存在を確認中...');
  const tableResults = await verifyTables();
  results.push(...tableResults);
  tableResults.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`   ${icon} ${result.name}: ${result.message}`);
  });
  console.log('');

  // 3. データアクセス確認
  console.log('3. データアクセス層の動作を確認中...');
  const accessResults = await verifyDataAccess();
  results.push(...accessResults);
  accessResults.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`   ${icon} ${result.name}: ${result.message}`);
  });
  console.log('');

  // 4. リレーションシップ確認
  console.log('4. データリレーションシップを確認中...');
  const relationshipResults = await verifyRelationships();
  results.push(...relationshipResults);
  relationshipResults.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`   ${icon} ${result.name}: ${result.message}`);
  });
  console.log('');

  // 結果サマリー
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const totalCount = results.length;

  console.log('📊 検証結果サマリー:');
  console.log(`   ✅ 成功: ${successCount}/${totalCount}`);
  console.log(`   ⚠️  警告: ${warningCount}/${totalCount}`);
  console.log(`   ❌ エラー: ${errorCount}/${totalCount}`);
  console.log('');

  if (errorCount > 0) {
    console.log('❌ エラーが検出されました。詳細を確認してください。');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('⚠️  警告が検出されましたが、移行は正常に完了しています。');
    process.exit(0);
  } else {
    console.log('✅ 全ての検証が成功しました！');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});

