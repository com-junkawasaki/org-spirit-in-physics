#!/usr/bin/env tsx
/**
 * Supabaseクエリパフォーマンステスト
 * 
 * 主要なクエリの実行時間を測定し、パフォーマンスを検証します
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

interface PerformanceResult {
  name: string;
  duration: number;
  rowCount: number;
  status: 'success' | 'error';
  error?: string;
}

const results: PerformanceResult[] = [];

async function measureQuery<T>(
  name: string,
  queryFn: () => Promise<{ data: T[] | null; error: any }>
): Promise<PerformanceResult> {
  const startTime = performance.now();
  
  try {
    const { data, error } = await queryFn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (error) {
      return {
        name,
        duration,
        rowCount: 0,
        status: 'error',
        error: error.message
      };
    }

    return {
      name,
      duration,
      rowCount: data?.length || 0,
      status: 'success'
    };
  } catch (error: any) {
    const endTime = performance.now();
    return {
      name,
      duration: endTime - startTime,
      rowCount: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function runPerformanceTests() {
  console.log('⚡ Supabaseクエリパフォーマンステストを開始します...\n');

  // 1. 参加者一覧取得
  const participantsResult = await measureQuery(
    '参加者一覧取得',
    () => client.from('participants').select('id, name, created_at').limit(100)
  );
  results.push(participantsResult);

  // 2. セッション一覧取得
  const sessionsResult = await measureQuery(
    'セッション一覧取得',
    () => client.from('participant_experiment_sessions').select('id, participant_id, start_time').limit(100)
  );
  results.push(sessionsResult);

  // 3. 応答データ取得（結合なし）
  const responsesResult = await measureQuery(
    '応答データ取得',
    () => client.from('participant_response_data').select('id, participant_id, stimulus_word, response_word').limit(100)
  );
  results.push(responsesResult);

  // 4. 感情分析ジョブ取得
  const jobsResult = await measureQuery(
    '感情分析ジョブ取得',
    () => client.from('participant_hume_analysis_jobs').select('id, participant_experiment_session_id, status').limit(100)
  );
  results.push(jobsResult);

  // 5. 分析結果取得
  const analysisResult = await measureQuery(
    '分析結果取得',
    () => client.from('participant_analysis_results').select('id, participant_id, spirit_probability').limit(100)
  );
  results.push(analysisResult);

  // 6. 集計クエリ（参加者ごとのセッション数）
  const aggregateResult = await measureQuery(
    '集計クエリ（参加者ごとのセッション数）',
    async () => {
      const { data: sessions, error } = await client
        .from('participant_experiment_sessions')
        .select('participant_id');
      
      if (error) return { data: null, error };
      
      const counts = new Map<string, number>();
      sessions?.forEach(s => {
        counts.set(s.participant_id, (counts.get(s.participant_id) || 0) + 1);
      });
      
      return { data: Array.from(counts.entries()), error: null };
    }
  );
  results.push(aggregateResult);

  // 結果表示
  console.log('📊 パフォーマンステスト結果:\n');
  console.log('| クエリ名 | 実行時間 (ms) | 取得行数 | ステータス |');
  console.log('|---------|--------------|---------|----------|');
  
  results.forEach(result => {
    const statusIcon = result.status === 'success' ? '✅' : '❌';
    const duration = result.duration.toFixed(2);
    const rowCount = result.rowCount;
    console.log(`| ${result.name} | ${duration} | ${rowCount} | ${statusIcon} |`);
  });

  console.log('');

  // パフォーマンス評価
  const avgDuration = results
    .filter(r => r.status === 'success')
    .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.status === 'success').length;

  const maxDuration = Math.max(...results.filter(r => r.status === 'success').map(r => r.duration));

  console.log('📈 パフォーマンス統計:');
  console.log(`   平均実行時間: ${avgDuration.toFixed(2)}ms`);
  console.log(`   最大実行時間: ${maxDuration.toFixed(2)}ms`);
  console.log('');

  // 推奨事項
  if (maxDuration > 1000) {
    console.log('⚠️  警告: 一部のクエリが1秒以上かかっています。インデックスの追加を検討してください。');
  } else if (maxDuration > 500) {
    console.log('💡 提案: 一部のクエリが500ms以上かかっています。最適化の余地があります。');
  } else {
    console.log('✅ 全てのクエリが良好なパフォーマンスを示しています。');
  }

  // エラーがある場合
  const errorCount = results.filter(r => r.status === 'error').length;
  if (errorCount > 0) {
    console.log(`\n❌ ${errorCount}件のクエリでエラーが発生しました。`);
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

runPerformanceTests().catch(error => {
  console.error('❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});

