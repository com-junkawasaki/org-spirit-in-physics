// Merkle DAG: lib.distance_matrix_processor
// 距離行列の出力と可視化システム
// 依存: 距離行列、埋め込み結果、可視化コンポーネント

import type { EmbeddingResult } from './embedding-calculator';

export interface VisualizationDataset {
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

export interface DistanceMatrixExport {
  matrix: number[][];
  words: string[];
  method: string;
  timestamp: string;
  metadata: {
    totalWords: number;
    averageDistance: number;
    minDistance: number;
    maxDistance: number;
    standardDeviation: number;
  };
}

// Merkle DAG: distance_matrix_processor.matrix_statistics
// 距離行列の統計計算
export function calculateDistanceMatrixStatistics(
  matrix: number[][],
  _words: string[] // Reserved for future use
): DistanceMatrixExport['metadata'] {
  const n = matrix.length;
  const distances: number[] = [];
  
  // 上三角行列の距離を収集
  for (let i = 0; i < n; i++) {
    const matrixRow = matrix[i];
    if (!matrixRow) continue;
    for (let j = i + 1; j < n; j++) {
      const val = matrixRow[j];
      if (typeof val === 'number' && Number.isFinite(val)) {
        distances.push(val);
      }
    }
  }
  
  if (distances.length === 0) {
    return {
      totalWords: n,
      averageDistance: 0,
      minDistance: 0,
      maxDistance: 0,
      standardDeviation: 0
    };
  }
  
  const averageDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const variance = distances.reduce((sum, d) => sum + Math.pow(d - averageDistance, 2), 0) / distances.length;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    totalWords: n,
    averageDistance,
    minDistance,
    maxDistance,
    standardDeviation
  };
}

// Merkle DAG: distance_matrix_processor.knn_graph_generation
// k-NNグラフの生成
export function generateKNNGraph(
  matrix: number[][],
  words: string[],
  k: number = 6
): VisualizationDataset {
  const n = matrix.length;
  const nodes: VisualizationDataset['nodes'] = [];
  const edges: VisualizationDataset['edges'] = [];
  
  // ノードの作成
  for (let i = 0; i < n; i++) {
    const node: any = {
      id: `node_${i}`,
      label: words[i] || `word_${i}`,
      x: 0, // 後で埋め込み結果で更新
      y: 0,
      color: '#1e40af',
      size: 1,
      metadata: {
        word: words[i] || `word_${i}`,
        observationRatio: 1.0
      }
    };
    nodes.push(node);
  }
  
  // 各点についてk個の最近傍を検索
  for (let i = 0; i < n; i++) {
    const distances: Array<{index: number, distance: number}> = [];
    const matrixRow = matrix[i];
    if (!matrixRow) continue;
    
    for (let j = 0; j < n; j++) {
      const val = matrixRow[j];
      if (i !== j && val !== undefined && Number.isFinite(val)) {
        distances.push({
          index: j,
          distance: val
        });
      }
    }
    
    // 距離でソート
    distances.sort((a, b) => a.distance - b.distance);
    
    // 上位k個を選択
    const kNeighbors = distances.slice(0, k);
    
    for (const neighbor of kNeighbors) {
      const j = neighbor.index;
      const weight = 1 / (1 + neighbor.distance); // 距離から重みを計算
      const similarity = 1 - neighbor.distance; // 類似度
      
      // エッジの追加（重複回避）
      if (i < j) {
        edges.push({
          source: `node_${i}`,
          target: `node_${j}`,
          weight,
          distance: neighbor.distance,
          color: `rgba(30, 64, 175, ${similarity * 0.8 + 0.2})`,
          width: Math.max(0.5, similarity * 3)
        });
      }
    }
  }
  
  // クラスタリング係数の計算
  const clusteringCoefficient = calculateClusteringCoefficient(nodes, edges);
  
  return {
    nodes,
    edges,
    metadata: {
      totalNodes: n,
      totalEdges: edges.length,
      method: 'knn',
      dimensions: 2,
      averageDistance: edges.reduce((sum, e) => sum + e.distance, 0) / edges.length,
      clusteringCoefficient
    }
  };
}

// Merkle DAG: distance_matrix_processor.clustering_coefficient
// クラスタリング係数の計算
function calculateClusteringCoefficient(
  nodes: VisualizationDataset['nodes'],
  edges: VisualizationDataset['edges']
): number {
  let totalCoefficient = 0;
  let validNodes = 0;
  
  nodes.forEach(node => {
    const nodeId = node.id;
    const neighbors = edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);
    
    if (neighbors.length < 2) {
      return;
    }
    
    // 隣接ノード間のエッジ数をカウント
    let neighborEdges = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const hasEdge = edges.some(e => 
          (e.source === neighbors[i] && e.target === neighbors[j]) ||
          (e.source === neighbors[j] && e.target === neighbors[i])
        );
        if (hasEdge) {
          neighborEdges++;
        }
      }
    }
    
    const possibleEdges = neighbors.length * (neighbors.length - 1) / 2;
    const coefficient = possibleEdges > 0 ? neighborEdges / possibleEdges : 0;
    
    totalCoefficient += coefficient;
    validNodes++;
  });
  
  return validNodes > 0 ? totalCoefficient / validNodes : 0;
}

// Merkle DAG: distance_matrix_processor.embedding_integration
// 埋め込み結果の統合
export function integrateEmbeddingResult(
  graph: VisualizationDataset,
  embedding: EmbeddingResult
): VisualizationDataset {
  // 埋め込み結果でノードの位置を更新
  graph.nodes.forEach(node => {
    const embeddingPoint = embedding.points.find(p => p.word === node.metadata.word);
    if (embeddingPoint) {
      node.x = embeddingPoint.x;
      node.y = embeddingPoint.y;
      if (embedding.dimensions === 3 && embeddingPoint.z !== undefined) {
        node.z = embeddingPoint.z;
      }
    }
  });
  
  // メタデータの更新
  graph.metadata.dimensions = embedding.dimensions;
  graph.metadata.method = embedding.method;
  
  return graph;
}

// Merkle DAG: distance_matrix_processor.color_assignment
// ノードの色付け（感情スコアに基づく）
export function assignNodeColors(
  graph: VisualizationDataset,
  emotionScores?: Record<string, number>
): VisualizationDataset {
  if (!emotionScores) {
    return graph;
  }
  
  // 感情スコアの正規化
  const scores = Object.values(emotionScores);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;
  
  graph.nodes.forEach(node => {
    const score = emotionScores[node.metadata.word] || 0;
    const normalizedScore = (score - minScore) / range;
    
    // 色の計算（青から赤へのグラデーション）
    const hue = normalizedScore * 240; // 240度（青）から0度（赤）
    node.color = `hsl(${hue}, 70%, 50%)`;
    node.size = Math.max(0.5, normalizedScore * 2 + 0.5);
    
    // メタデータの更新
    node.metadata.emotionScore = score;
  });
  
  return graph;
}

// Merkle DAG: distance_matrix_processor.export_format
// 距離行列のエクスポート
export function exportDistanceMatrix(
  matrix: number[][],
  words: string[],
  method: string
): DistanceMatrixExport {
  const statistics = calculateDistanceMatrixStatistics(matrix, words);
  
  return {
    matrix,
    words,
    method,
    timestamp: new Date().toISOString(),
    metadata: statistics
  };
}

// Merkle DAG: distance_matrix_processor.csv_export
// CSV形式でのエクスポート
export function exportDistanceMatrixCSV(
  matrix: number[][],
  words: string[]
): string {
  const n = matrix.length;
  let csv = 'Word';
  
  // ヘッダー行
  for (let i = 0; i < n; i++) {
    csv += `,${words[i] || `word_${i}`}`;
  }
  csv += '\n';
  
  // データ行
  for (let i = 0; i < n; i++) {
    csv += `${words[i] || `word_${i}`}`;
    const matrixRow = matrix[i];
    if (matrixRow) {
      for (let j = 0; j < n; j++) {
        const val = matrixRow[j];
        csv += `,${val !== undefined ? val.toFixed(6) : '0'}`;
      }
    }
    csv += '\n';
  }
  
  return csv;
}

// Merkle DAG: distance_matrix_processor.json_export
// JSON形式でのエクスポート
export function exportDistanceMatrixJSON(
  matrix: number[][],
  words: string[],
  method: string
): string {
  const exportData = exportDistanceMatrix(matrix, words, method);
  return JSON.stringify(exportData, null, 2);
}

// Merkle DAG: distance_matrix_processor.visualization_dataset_generation
// 可視化データセットの生成
export function generateVisualizationDataset(
  distanceMatrix: number[][],
  words: string[],
  embedding?: EmbeddingResult,
  emotionScores?: Record<string, number>,
  k: number = 6
): VisualizationDataset {
  // 1. k-NNグラフの生成
  let graph = generateKNNGraph(distanceMatrix, words, k);
  
  // 2. 埋め込み結果の統合
  if (embedding) {
    graph = integrateEmbeddingResult(graph, embedding);
  }
  
  // 3. ノードの色付け
  if (emotionScores) {
    graph = assignNodeColors(graph, emotionScores);
  }
  
  return graph;
}

// Merkle DAG: distance_matrix_processor.main_processing
// メイン処理関数
export function processDistanceMatrix(
  matrix: number[][],
  words: string[],
  method: string,
  options: {
    k?: number;
    embedding?: EmbeddingResult;
    emotionScores?: Record<string, number>;
    exportFormats?: ('csv' | 'json')[];
  } = {}
): {
  visualization: VisualizationDataset;
  exports: {
    csv?: string;
    json?: string;
  };
  statistics: DistanceMatrixExport['metadata'];
} {
  // 可視化データセットの生成
  const visualization = generateVisualizationDataset(
    matrix,
    words,
    options.embedding,
    options.emotionScores,
    options.k || 6
  );
  
  // エクスポート
  const exports: { csv?: string; json?: string } = {};
  if (options.exportFormats?.includes('csv')) {
    exports.csv = exportDistanceMatrixCSV(matrix, words);
  }
  if (options.exportFormats?.includes('json')) {
    exports.json = exportDistanceMatrixJSON(matrix, words, method);
  }
  
  // 統計情報
  const statistics = calculateDistanceMatrixStatistics(matrix, words);
  
  return {
    visualization,
    exports,
    statistics
  };
}
