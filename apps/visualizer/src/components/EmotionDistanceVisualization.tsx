// Merkle DAG: components.emotion_distance_visualization
// 感情距離可視化コンポーネント
// 依存: React, 感情距離計算API, 3D可視化

'use client'

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// 3D可視化コンポーネントの動的インポート
const Force3DWordGraphTypeGPU = dynamic(
  () => import('./Force3DWordGraphTypeGPU'),
  { ssr: false }
);

interface EmotionDistanceVisualizationProps {
  participantId: string;
  experimentId?: string;
  width?: number;
  height?: number;
  method?: 'cosine' | 'weighted_cosine' | 'gower' | 'combined' | 'fusion';
  embeddingMethod?: 'pca' | 'umap' | 'force';
  dimensions?: 2 | 3;
  k?: number;
  gamma?: number;
  alpha?: number;
  topKEmotions?: string[];
}

interface VisualizationData {
  nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    z?: number;
    color: string;
    size: number;
    metadata: {
      word: string;
      reactionTime?: number;
      emotionScore?: number;
      observationRatio: number;
    };
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    distance: number;
    color: string;
    width: number;
  }>;
  metadata: {
    totalNodes: number;
    totalEdges: number;
    method: string;
    dimensions: 2 | 3;
    averageDistance: number;
    clusteringCoefficient: number;
  };
}

export default function EmotionDistanceVisualization({
  participantId,
  experimentId,
  width = 1000,
  height = 600,
  method = 'cosine',
  embeddingMethod = 'pca',
  dimensions = 3,
  k = 6,
  gamma = 0.1,
  alpha = 0.6,
  topKEmotions = ['joy', 'calm', 'anger', 'fear', 'surprise']
}: EmotionDistanceVisualizationProps) {
  const [data, setData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // ローカルコントロール状態（親未管理でも動作するように）
  const [methodLocal, setMethodLocal] = useState<Required<EmotionDistanceVisualizationProps>['method']>(method);
  const [embeddingLocal, setEmbeddingLocal] = useState<Required<EmotionDistanceVisualizationProps>['embeddingMethod']>(embeddingMethod);
  const [dimensionsLocal, setDimensionsLocal] = useState<Required<EmotionDistanceVisualizationProps>['dimensions']>(dimensions);
  const [kLocal, setKLocal] = useState<number>(k);

  // Merkle DAG: components.emotion_distance_visualization.data_fetching
  // データの取得
  const fetchEmotionDistanceData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analysis/emotion-distance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
          experimentId,
          method: methodLocal,
          embeddingMethod: embeddingLocal,
          dimensions: dimensionsLocal,
          k: kLocal,
          gamma,
          alpha,
          topKEmotions
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result.visualization);
    } catch (err) {
      console.error('Error fetching emotion distance data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [participantId, experimentId, methodLocal, embeddingLocal, dimensionsLocal, kLocal, gamma, alpha, topKEmotions]);

  // Merkle DAG: components.emotion_distance_visualization.effect_hooks
  // エフェクトフック
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && participantId) {
      fetchEmotionDistanceData();
    }
  }, [mounted, participantId, fetchEmotionDistanceData]);

  // Merkle DAG: components.emotion_distance_visualization.data_transformation
  // データの変換（3D可視化用）
  const transformDataFor3D = useCallback((vizData: VisualizationData) => {
    const nodes = vizData.nodes.map(node => ({
      id: node.id,
      label: node.label,
      x: node.x,
      y: node.y,
      z: node.z || 0,
      color: node.color,
      scale: node.size,
      fixed: false,
      initial: [node.x, node.y, node.z || 0] as [number, number, number]
    }));

    const links = vizData.edges.map(edge => ({
      source: parseInt(edge.source.replace('node_', '')),
      target: parseInt(edge.target.replace('node_', '')),
      weight: edge.weight,
      mode: 'tension' as const, // デフォルトモード
      L0: 0,
      k: 0
    }));

    return { nodes, links };
  }, []);

  // Merkle DAG: components.emotion_distance_visualization.rendering
  // レンダリング
  if (!mounted) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="text-blue-600">Calculating emotion distances...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="text-red-600">
          <div className="font-semibold">Error:</div>
          <div className="text-sm">{error}</div>
          <button
            type="button"
            onClick={fetchEmotionDistanceData}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  const { nodes, links } = transformDataFor3D(data);

  return (
    <div className="w-full h-full">
      {/* メタデータ表示 */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-semibold">Method:</span>
            <div className="text-gray-600">{data.metadata.method}</div>
          </div>
          <div>
            <span className="font-semibold">Nodes:</span>
            <div className="text-gray-600">{data.metadata.totalNodes}</div>
          </div>
          <div>
            <span className="font-semibold">Edges:</span>
            <div className="text-gray-600">{data.metadata.totalEdges}</div>
          </div>
          <div>
            <span className="font-semibold">Clustering:</span>
            <div className="text-gray-600">{data.metadata.clusteringCoefficient.toFixed(3)}</div>
          </div>
        </div>
      </div>

      {/* 3D可視化 */}
      <div className="border rounded-lg overflow-hidden">
        <Force3DWordGraphTypeGPU
          nodes={nodes}
          links={links}
          width={width}
          height={height}
          background="#ffffff"
          physics={{
            springK: 2.0,
            repulsionK: 2000.0,
            damping: 0.92,
            restLength: 80,
            maxSpeed: 200,
            shellRadius: 300,
            shellK: 1.5,
            minSep: 40,
            sepK: 3000
          }}
        />
      </div>

      {/* 制御パネル */}
      <div className="mt-4 p-4 bg-white border rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="block text-sm font-medium text-gray-700 mb-1">
              Method
            </div>
            <select
              value={methodLocal}
              onChange={(e) => setMethodLocal(e.target.value as EmotionDistanceVisualizationProps['method'])}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="cosine">Cosine Distance</option>
              <option value="weighted_cosine">Weighted Cosine</option>
              <option value="gower">Gower Distance</option>
              <option value="combined">Combined (Cosine + Soft-DTW)</option>
              <option value="fusion">Fusion (Kernel CKA)</option>
            </select>
          </div>

          <div>
            <div className="block text-sm font-medium text-gray-700 mb-1">
              Embedding
            </div>
            <select
              value={embeddingLocal}
              onChange={(e) => setEmbeddingLocal(e.target.value as EmotionDistanceVisualizationProps['embeddingMethod'])}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="pca">PCA</option>
              <option value="umap">UMAP</option>
              <option value="force">Force Layout</option>
            </select>
          </div>

          <div>
            <div className="block text-sm font-medium text-gray-700 mb-1">
              Dimensions
            </div>
            <select
              value={dimensionsLocal}
              onChange={(e) => setDimensionsLocal(Number(e.target.value) as 2 | 3)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value={2}>2D</option>
              <option value={3}>3D</option>
            </select>
          </div>

          <div>
            <div className="block text-sm font-medium text-gray-700 mb-1">
              k-NN
            </div>
            <input
              type="number"
              min="3"
              max="20"
              value={kLocal}
              onChange={(e) => setKLocal(Number(e.target.value))}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Participant: {participantId}
            {experimentId && ` | Experiment: ${experimentId}`}
          </div>
          <button
            type="button"
            onClick={fetchEmotionDistanceData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Recalculate
          </button>
        </div>
      </div>
    </div>
  );
}
