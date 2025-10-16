'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Database, BarChart3 } from 'lucide-react';

interface PipelinePhase {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  description: string;
  duration?: number;
  error?: string;
}

export default function VisualizationDatasetPage() {
  const [participantId, setParticipantId] = useState('2a0d7a69-f953-4c29-87a5-8a8e4e8bd413');
  const [experimentId, setExperimentId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [phases, setPhases] = useState<PipelinePhase[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const pipelinePhases: Omit<PipelinePhase, 'status' | 'duration' | 'error'>[] = [
    {
      id: 'validation',
      name: '入力データ検証',
      description: '参加者・実験データの存在確認と整合性チェック'
    },
    {
      id: 'extraction',
      name: 'データ抽出・統合',
      description: 'セッション、感情、生理データの抽出と統合'
    },
    {
      id: 'timeseries',
      name: '時系列データ処理',
      description: 'session_data.jsonのイベント処理と時系列構築'
    },
    {
      id: 'emotion',
      name: '感情データ処理',
      description: 'burst, face, language, prosodyデータの分類・処理'
    },
    {
      id: 'physiological',
      name: '生理データ処理',
      description: '8チャンネル生理データの分類・正規化'
    },
    {
      id: 'integration',
      name: 'データ統合・正規化',
      description: '全データの時系列統合と正規化処理'
    },
    {
      id: 'visualization',
      name: '描画用データセット生成',
      description: '可視化用データセットの生成と最適化'
    },
    {
      id: 'quality',
      name: '品質チェック',
      description: 'データ品質の検証とメトリクス計算'
    },
    {
      id: 'storage',
      name: 'データセット保存',
      description: '生成されたデータセットのNeo4j保存'
    }
  ];

  const runPipeline = async () => {
    if (!participantId.trim()) {
      setError('参加者IDを入力してください');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);
    
    // フェーズの初期化
    const initialPhases = pipelinePhases.map(phase => ({
      ...phase,
      status: 'pending' as const
    }));
    setPhases(initialPhases);

    try {
      const startTime = Date.now();
      
      const response = await fetch('/api/pipeline/visualization-dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: participantId.trim(),
          experimentId: experimentId.trim() || undefined
        }),
      });

      const data = await response.json();
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      if (!response.ok) {
        throw new Error(data.error || 'パイプライン実行エラー');
      }

      // 全フェーズを完了としてマーク
      setPhases(prevPhases => 
        prevPhases.map(phase => ({
          ...phase,
          status: 'completed' as const,
          duration: Math.round(totalDuration / prevPhases.length)
        }))
      );

      setResult({
        ...data.data,
        totalDuration,
        phases: pipelinePhases.length
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // エラー時は実行中フェーズをエラーとしてマーク
      setPhases(prevPhases => 
        prevPhases.map(phase => ({
          ...phase,
          status: phase.status === 'running' ? 'error' as const : phase.status
        }))
      );
    } finally {
      setIsRunning(false);
    }
  };

  const getPhaseIcon = (status: PipelinePhase['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPhaseStatusText = (status: PipelinePhase['status']) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'error':
        return 'エラー';
      case 'running':
        return '実行中';
      default:
        return '待機中';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">描画用データセット生成パイプライン</h1>
          <p className="text-gray-600">時系列可視化用の統合データセットを生成します</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">パイプライン設定</h2>
          <p className="text-gray-600">
            参加者IDと実験IDを指定して描画用データセットを生成します
          </p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="participantId" className="block text-sm font-medium">参加者ID *</label>
              <input
                id="participantId"
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="2a0d7a69-f953-4c29-87a5-8a8e4e8bd413"
                disabled={isRunning}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="experimentId" className="block text-sm font-medium">実験ID (オプション)</label>
              <input
                id="experimentId"
                type="text"
                value={experimentId}
                onChange={(e) => setExperimentId(e.target.value)}
                placeholder="experiment_xxx"
                disabled={isRunning}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <button 
            onClick={runPipeline} 
            disabled={isRunning || !participantId.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isRunning ? 'パイプライン実行中...' : 'パイプライン実行'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {phases.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">パイプライン実行状況</h2>
            <p className="text-gray-600">
              各フェーズの実行状況と結果を表示します
            </p>
          </div>
          <div>
            <div className="space-y-4">
              {phases.map((phase, index) => (
                <div key={phase.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {getPhaseIcon(phase.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {index + 1}. {phase.name}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        phase.status === 'completed' ? 'bg-green-100 text-green-800' :
                        phase.status === 'error' ? 'bg-red-100 text-red-800' :
                        phase.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getPhaseStatusText(phase.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                    {phase.duration && (
                      <p className="text-xs text-gray-500 mt-1">
                        実行時間: {phase.duration}ms
                      </p>
                    )}
                    {phase.error && (
                      <p className="text-xs text-red-600 mt-1">
                        エラー: {phase.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>パイプライン実行完了</span>
            </h2>
            <p className="text-gray-600">
              描画用データセットが正常に生成されました
            </p>
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">データセットID</label>
                <p className="text-sm text-gray-600 font-mono">{result.datasetId}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">総データポイント</label>
                <p className="text-sm text-gray-600">{result.statistics.totalDataPoints.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">実行時間</label>
                <p className="text-sm text-gray-600">{result.totalDuration}ms</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">品質スコア</label>
                <p className="text-sm text-gray-600">
                  {result.statistics.quality?.qualityScore 
                    ? `${(result.statistics.quality.qualityScore * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">時間範囲</label>
                <p className="text-sm text-gray-600">
                  {new Date(result.statistics.timeRange.start).toLocaleString()} - 
                  {new Date(result.statistics.timeRange.end).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">データタイプ</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.statistics.dataTypes.map((type: string) => (
                    <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">パイプライン概要</h2>
          <p className="text-gray-600">
            描画用データセット生成パイプラインの処理フロー
          </p>
        </div>
        <div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Database className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-medium">データ抽出</h4>
                <p className="text-sm text-gray-600">セッション・感情・生理データの統合抽出</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <BarChart3 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-medium">並列処理</h4>
                <p className="text-sm text-gray-600">時系列・感情・生理データの並列処理</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <CheckCircle className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <h4 className="font-medium">品質保証</h4>
                <p className="text-sm text-gray-600">データ品質チェックとメトリクス計算</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">処理フロー</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. 入力データ検証（参加者・実験データの存在確認）</li>
                <li>2. データ抽出・統合（セッション、感情、生理データ）</li>
                <li>3. 並列処理（時系列、感情、生理データの分類・処理）</li>
                <li>4. データ統合・正規化（時系列基準での統合）</li>
                <li>5. 描画用データセット生成（可視化最適化）</li>
                <li>6. 品質チェック（データ品質検証）</li>
                <li>7. データセット保存（Neo4jへの永続化）</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
