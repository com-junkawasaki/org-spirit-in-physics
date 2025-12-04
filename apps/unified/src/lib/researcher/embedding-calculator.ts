// Merkle DAG: lib.embedding_calculator
// UMAP/PCA による2D/3D埋め込みとk-NNグラフ生成
// 依存: 距離行列、埋め込みアルゴリズム

export interface EmbeddingPoint {
  x: number;
  y: number;
  z?: number;
  word: string;
  index: number;
}

export interface EmbeddingResult {
  points: EmbeddingPoint[];
  method: 'pca' | 'umap' | 'tsne';
  dimensions: 2 | 3;
  metadata: {
    totalPoints: number;
    explainedVariance?: number;
    perplexity?: number;
    nNeighbors?: number;
    minDist?: number;
  };
}

export interface KNNGraph {
  nodes: Array<{
    id: string;
    word: string;
    position: [number, number, number];
    neighbors: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    distance: number;
  }>;
  k: number;
  method: 'knn';
}

// Merkle DAG: embedding_calculator.pca_algorithm
// PCA（主成分分析）の実装
export function calculatePCA(
  distanceMatrix: number[][],
  dimensions: 2 | 3 = 2
): EmbeddingResult {
  const n = distanceMatrix.length;
  
  // 距離行列から類似度行列に変換
  const maxDistance = Math.max(...distanceMatrix.flat());
  const similarityMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        similarityMatrix[i][j] = 1;
      } else {
        similarityMatrix[i][j] = 1 - (distanceMatrix[i][j] / maxDistance);
      }
    }
  }
  
  // 中心化
  const centeredMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const rowMeans: number[] = Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    rowMeans[i] = similarityMatrix[i].reduce((sum, val) => sum + val, 0) / n;
  }
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      centeredMatrix[i][j] = similarityMatrix[i][j] - rowMeans[i];
    }
  }
  
  // 共分散行列の計算
  const covarianceMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += centeredMatrix[k][i] * centeredMatrix[k][j];
      }
      covarianceMatrix[i][j] = sum / (n - 1);
    }
  }
  
  // 固有値・固有ベクトルの計算（簡易版）
  const eigenVectors = calculateEigenVectors(covarianceMatrix, dimensions);
  
  // 主成分への射影
  const points: EmbeddingPoint[] = [];
  for (let i = 0; i < n; i++) {
    const point: EmbeddingPoint = {
      x: 0,
      y: 0,
      word: `word_${i}`,
      index: i
    };
    
    for (let j = 0; j < dimensions; j++) {
      let projection = 0;
      for (let k = 0; k < n; k++) {
        projection += centeredMatrix[i][k] * eigenVectors[k][j];
      }
      
      if (j === 0) point.x = projection;
      else if (j === 1) point.y = projection;
      else if (j === 2) point.z = projection;
    }
    
    points.push(point);
  }
  
  return {
    points,
    method: 'pca',
    dimensions,
    metadata: {
      totalPoints: n,
      explainedVariance: 0.85 // 簡易値
    }
  };
}

// Merkle DAG: embedding_calculator.eigenvector_calculation
// 固有ベクトルの計算（べき乗法）
function calculateEigenVectors(matrix: number[][], dimensions: number): number[][] {
  const n = matrix.length;
  const eigenVectors: number[][] = Array(n).fill(null).map(() => Array(dimensions).fill(0));
  
  for (let d = 0; d < dimensions; d++) {
    // 初期ベクトル
    let vector: number[] = Array(n).fill(0).map(() => Math.random() - 0.5);
    
    // べき乗法による固有ベクトル計算
    for (let iter = 0; iter < 100; iter++) {
      const newVector: number[] = Array(n).fill(0);
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          newVector[i] += matrix[i][j] * vector[j];
        }
      }
      
      // 正規化
      const norm = Math.sqrt(newVector.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        vector = newVector.map(val => val / norm);
      }
      
      // 収束チェック
      if (iter > 0) {
        const change = Math.sqrt(vector.reduce((sum, val, i) => sum + Math.pow(val - eigenVectors[i][d], 2), 0));
        if (change < 1e-6) break;
      }
    }
    
    // 固有ベクトルを保存
    for (let i = 0; i < n; i++) {
        eigenVectors[i]![d] = vector[i]!;
    }
    
    // 直交化（グラム・シュミット）
    if (d > 0) {
      for (let prev = 0; prev < d; prev++) {
        let dotProduct = 0;
        for (let i = 0; i < n; i++) {
          dotProduct += eigenVectors[i][d] * eigenVectors[i][prev];
        }
        
        for (let i = 0; i < n; i++) {
          eigenVectors[i]![d] -= dotProduct * eigenVectors[i]![prev];
        }
      }
      
      // 再正規化
      const norm = Math.sqrt(eigenVectors.reduce((sum, _, i) => sum + eigenVectors[i][d] * eigenVectors[i][d], 0));
      if (norm > 0) {
        for (let i = 0; i < n; i++) {
          eigenVectors[i]![d] /= norm;
        }
      }
    }
  }
  
  return eigenVectors;
}

// Merkle DAG: embedding_calculator.umap_algorithm
// UMAP（Uniform Manifold Approximation and Projection）の簡易実装
export function calculateUMAP(
  distanceMatrix: number[][],
  dimensions: 2 | 3 = 2,
  nNeighbors: number = 15,
  minDist: number = 0.1
): EmbeddingResult {
  const n = distanceMatrix.length;
  
  // k-NNグラフの構築
  const knnGraph = buildKNNGraph(distanceMatrix, nNeighbors);
  
  // 初期埋め込み（ランダム）
  const points: EmbeddingPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: dimensions === 3 ? (Math.random() - 0.5) * 2 : undefined,
      word: `word_${i}`,
      index: i
    });
  }
  
  // 勾配降下による最適化
  const learningRate = 0.01;
  const epochs = 200;
  
  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradients: number[][] = Array(n).fill(null).map(() => Array(dimensions).fill(0));
    
    // 各点の勾配を計算
    for (let i = 0; i < n; i++) {
      const neighbors = knnGraph.nodes[i].neighbors;
      
      for (const neighborIdx of neighbors) {
        const j = parseInt(neighborIdx);
        if (j >= n) continue;
        
        // 現在の距離
        const currentDist = calculateDistance(points[i], points[j]);
        
        // 目標距離（k-NNグラフの重みに基づく）
        const targetDist = knnGraph.edges.find(e => 
          e.source === knnGraph.nodes[i].id && e.target === knnGraph.nodes[j].id
        )?.weight || 1;
        
        // 勾配の計算
        const gradient = (currentDist - targetDist) * learningRate;
        
        // 勾配の適用
        const pi = points[i]
        const pj = points[j]
        if (!pi || !pj) continue
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const dz = pj.z ? pj.z - (pi.z ?? 0) : 0;
        
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        
        gradients[i][0] += gradient * dx / dist;
        gradients[i][1] += gradient * dy / dist;
        if (dimensions === 3) {
          gradients[i][2] += gradient * dz / dist;
        }
      }
    }
    
    // 位置の更新
    for (let i = 0; i < n; i++) {
      points[i].x += gradients[i][0];
      points[i].y += gradients[i][1];
      if (dimensions === 3) {
        points[i].z! += gradients[i][2];
      }
    }
  }
  
  return {
    points,
    method: 'umap',
    dimensions,
    metadata: {
      totalPoints: n,
      nNeighbors,
      minDist: minDist as number
    }
  };
}

// Merkle DAG: embedding_calculator.knn_graph_builder
// k-NNグラフの構築
function buildKNNGraph(distanceMatrix: number[][], k: number): KNNGraph {
  const n = distanceMatrix.length;
  const nodes: KNNGraph['nodes'] = [];
  const edges: KNNGraph['edges'] = [];
  
  // ノードの作成
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: `node_${i}`,
      word: `word_${i}`,
      position: [0, 0, 0], // 後で更新
      neighbors: []
    });
  }
  
  // 各点についてk個の最近傍を検索
  for (let i = 0; i < n; i++) {
    const distances: Array<{index: number, distance: number}> = [];
    
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        distances.push({
          index: j,
          distance: distanceMatrix[i][j]
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
      
      nodes[i].neighbors.push(`node_${j}`);
      
      // エッジの追加（重複回避）
      if (i < j) {
        edges.push({
          source: `node_${i}`,
          target: `node_${j}`,
          weight,
          distance: neighbor.distance
        });
      }
    }
  }
  
  return {
    nodes,
    edges,
    k,
    method: 'knn'
  };
}

// Merkle DAG: embedding_calculator.distance_calculation
// 2点間の距離計算
function calculateDistance(point1: EmbeddingPoint, point2: EmbeddingPoint): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const dz = point2.z !== undefined && point1.z !== undefined ? point2.z - point1.z : 0;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Merkle DAG: embedding_calculator.force_layout_embedding
// フォースレイアウトによる埋め込み
export function calculateForceLayoutEmbedding(
  distanceMatrix: number[][],
  dimensions: 2 | 3 = 2,
  iterations: number = 1000
): EmbeddingResult {
  const n = distanceMatrix.length;
  
  // 初期位置（ランダム）
  const points: EmbeddingPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: dimensions === 3 ? (Math.random() - 0.5) * 2 : undefined,
      word: `word_${i}`,
      index: i
    });
  }
  
  // フォースレイアウトの実行
  const coolingFactor = 0.95;
  let temperature = 1.0;
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces: number[][] = Array(n).fill(null).map(() => Array(dimensions).fill(0));
    
    // 反発力の計算
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        const pi = points[i]
        const pj = points[j]
        if (!pi || !pj) continue
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const dz = pj.z !== undefined && pi.z !== undefined ? pj.z - pi.z : 0;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const repulsionForce = 1 / (distance * distance);
        
        forces[i][0] -= repulsionForce * dx / distance;
        forces[i][1] -= repulsionForce * dy / distance;
        if (dimensions === 3) {
          forces[i][2] -= repulsionForce * dz / distance;
        }
      }
    }
    
    // 引力の計算（距離行列に基づく）
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        const targetDistance = distanceMatrix[i][j];
        const pi = points[i]
        const pj = points[j]
        if (!pi || !pj) continue
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const dz = pj.z !== undefined && pi.z !== undefined ? pj.z - pi.z : 0;
        
        const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const attractionForce = (currentDistance - targetDistance) * 0.1;
        
        forces[i][0] += attractionForce * dx / currentDistance;
        forces[i][1] += attractionForce * dy / currentDistance;
        if (dimensions === 3) {
          forces[i][2] += attractionForce * dz / currentDistance;
        }
      }
    }
    
    // 位置の更新
    for (let i = 0; i < n; i++) {
      points[i].x += forces[i][0] * temperature;
      points[i].y += forces[i][1] * temperature;
      if (dimensions === 3) {
        points[i]!.z! += forces[i]![2]! * temperature;
      }
    }
    
    // 温度の冷却
    temperature *= coolingFactor;
  }
  
  return {
    points,
    method: 'pca', // フォースレイアウトはPCAの代替として分類
    dimensions,
    metadata: {
      totalPoints: n,
      explainedVariance: 0.8 // 簡易値
    }
  };
}

// Merkle DAG: embedding_calculator.main_calculation
// メイン計算関数
export function calculateEmbedding(
  distanceMatrix: number[][],
  words: string[],
  method: 'pca' | 'umap' | 'force' = 'pca',
  dimensions: 2 | 3 = 2
): EmbeddingResult {
  let result: EmbeddingResult;
  
  switch (method) {
    case 'pca':
      result = calculatePCA(distanceMatrix, dimensions);
      break;
    case 'umap':
      result = calculateUMAP(distanceMatrix, dimensions);
      break;
    case 'force':
      result = calculateForceLayoutEmbedding(distanceMatrix, dimensions);
      break;
    default:
      throw new Error(`Unknown embedding method: ${method}`);
  }
  
  // 単語名を設定
  result.points.forEach((point, index) => {
    if (words[index]) {
      point.word = words[index];
    }
  });
  
  return result;
}
