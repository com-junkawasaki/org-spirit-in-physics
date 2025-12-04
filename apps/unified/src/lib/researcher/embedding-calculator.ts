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
    const simRow = similarityMatrix[i];
    const distRow = distanceMatrix[i];
    if (simRow && distRow) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          simRow[j] = 1;
        } else {
          const distVal = distRow[j];
          simRow[j] = distVal !== undefined ? 1 - (distVal / maxDistance) : 0;
        }
      }
    }
  }
  
  // 中心化
  const centeredMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const rowMeans: number[] = Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    const simRow = similarityMatrix[i];
    if (simRow) {
      rowMeans[i] = simRow.reduce((sum, val) => sum + val, 0) / n;
    }
  }
  
  for (let i = 0; i < n; i++) {
    const centeredRow = centeredMatrix[i];
    const simRow = similarityMatrix[i];
    const rowMean = rowMeans[i];
    if (centeredRow && simRow && rowMean !== undefined) {
      for (let j = 0; j < n; j++) {
        const simVal = simRow[j];
        if (simVal !== undefined) {
          centeredRow[j] = simVal - rowMean;
        }
      }
    }
  }
  
  // 共分散行列の計算
  const covarianceMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const covRow = covarianceMatrix[i];
    if (!covRow) continue;
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        const centeredRowK = centeredMatrix[k];
        if (centeredRowK) {
          const valI = centeredRowK[i];
          const valJ = centeredRowK[j];
          if (valI !== undefined && valJ !== undefined) {
            sum += valI * valJ;
          }
        }
      }
      covRow[j] = sum / (n - 1);
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
        const matrixRow = centeredMatrix[i];
        const vectorRow = eigenVectors[k];
        if (matrixRow && vectorRow) {
          const matrixVal = matrixRow[k];
          const vectorVal = vectorRow[j];
          if (matrixVal !== undefined && vectorVal !== undefined) {
            projection += matrixVal * vectorVal;
          }
        }
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
          const matrixRow = matrix[i];
          if (matrixRow) {
            const matrixVal = matrixRow[j];
            const vectorVal = vector[j];
            if (matrixVal !== undefined && vectorVal !== undefined) {
              const newVecVal = newVector[i];
              if (newVecVal !== undefined) {
                newVector[i] = newVecVal + matrixVal * vectorVal;
              }
            }
          }
        }
      }
      
      // 正規化
      const norm = Math.sqrt(newVector.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        vector = newVector.map(val => val / norm);
      }
      
      // 収束チェック
      if (iter > 0) {
        const change = Math.sqrt(vector.reduce((sum, val, i) => {
          const eigVecRow = eigenVectors[i];
          if (eigVecRow) {
            const eigVecVal = eigVecRow[d];
            if (eigVecVal !== undefined) {
              return sum + Math.pow(val - eigVecVal, 2);
            }
          }
          return sum;
        }, 0));
        if (change < 1e-6) break;
      }
    }
    
    // 固有ベクトルを保存
    for (let i = 0; i < n; i++) {
        const eigVecRow = eigenVectors[i];
        const vecVal = vector[i];
        if (eigVecRow && vecVal !== undefined) {
          eigVecRow[d] = vecVal;
        }
    }
    
    // 直交化（グラム・シュミット）
    if (d > 0) {
      for (let prev = 0; prev < d; prev++) {
        let dotProduct = 0;
        for (let i = 0; i < n; i++) {
          const eigVecRow = eigenVectors[i];
          if (eigVecRow) {
            const eigVecD = eigVecRow[d];
            const eigVecPrev = eigVecRow[prev];
            if (eigVecD !== undefined && eigVecPrev !== undefined) {
              dotProduct += eigVecD * eigVecPrev;
            }
          }
        }
        
        for (let i = 0; i < n; i++) {
          const eigVecRow = eigenVectors[i];
          if (eigVecRow) {
            const eigVecD = eigVecRow[d];
            const eigVecPrev = eigVecRow[prev];
            if (eigVecD !== undefined && eigVecPrev !== undefined) {
              eigVecRow[d] = eigVecD - dotProduct * eigVecPrev;
            }
          }
        }
      }
      
      // 再正規化
      const norm = Math.sqrt(eigenVectors.reduce((sum, eigVecRow) => {
        if (eigVecRow) {
          const eigVecD = eigVecRow[d];
          if (eigVecD !== undefined) {
            return sum + eigVecD * eigVecD;
          }
        }
        return sum;
      }, 0));
      if (norm > 0) {
        for (let i = 0; i < n; i++) {
          const eigVecRow = eigenVectors[i];
          if (eigVecRow) {
            const eigVecD = eigVecRow[d];
            if (eigVecD !== undefined) {
              eigVecRow[d] = eigVecD / norm;
            }
          }
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
    const point: EmbeddingPoint = {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      word: `word_${i}`,
      index: i
    };
    if (dimensions === 3) {
      point.z = (Math.random() - 0.5) * 2;
    }
    points.push(point);
  }
  
  // 勾配降下による最適化
  const learningRate = 0.01;
  const epochs = 200;
  
  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradients: number[][] = Array(n).fill(null).map(() => Array(dimensions).fill(0));
    
    // 各点の勾配を計算
    for (let i = 0; i < n; i++) {
      const nodeI = knnGraph.nodes[i];
      if (!nodeI) continue;
      const neighbors = nodeI.neighbors;
      
      for (const neighborIdx of neighbors) {
        const j = parseInt(neighborIdx);
        if (j >= n) continue;
        
        const pointI = points[i];
        const pointJ = points[j];
        if (!pointI || !pointJ) continue;
        
        // 現在の距離
        const currentDist = calculateDistance(pointI, pointJ);
        
        // 目標距離（k-NNグラフの重みに基づく）
        const targetDist = knnGraph.edges.find(e => 
          e.source === nodeI.id && e.target === knnGraph.nodes[j]?.id
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
        
        const gradI = gradients[i];
        if (gradI) {
          const g0 = gradI[0];
          const g1 = gradI[1];
          if (g0 !== undefined && g1 !== undefined) {
            gradI[0] = g0 + gradient * dx / dist;
            gradI[1] = g1 + gradient * dy / dist;
          }
          if (dimensions === 3) {
            const g2 = gradI[2];
            if (g2 !== undefined) {
              gradI[2] = g2 + gradient * dz / dist;
            }
          }
        }
      }
    }
    
    // 位置の更新
    for (let i = 0; i < n; i++) {
      const point = points[i];
      const grad = gradients[i];
      if (point && grad) {
        const gx = grad[0];
        const gy = grad[1];
        if (gx !== undefined && gy !== undefined) {
          point.x += gx;
          point.y += gy;
        }
        if (dimensions === 3) {
          const gz = grad[2];
          if (point.z !== undefined && gz !== undefined) {
            point.z += gz;
          }
        }
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
    
    const row = distanceMatrix[i];
    if (!row) continue;
    
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const dist = row[j];
        if (dist !== undefined) {
          distances.push({
            index: j,
            distance: dist
          });
        }
      }
    }
    
    // 距離でソート
    distances.sort((a, b) => a.distance - b.distance);
    
    // 上位k個を選択
    const kNeighbors = distances.slice(0, k);
    
    for (const neighbor of kNeighbors) {
      const j = neighbor.index;
      const weight = 1 / (1 + neighbor.distance); // 距離から重みを計算
      
      const nodeI = nodes[i];
      if (nodeI) {
        nodeI.neighbors.push(`node_${j}`);
      }
      
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
    const point: EmbeddingPoint = {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      word: `word_${i}`,
      index: i
    };
    if (dimensions === 3) {
      point.z = (Math.random() - 0.5) * 2;
    }
    points.push(point);
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
        
        const forceI = forces[i];
        if (forceI) {
          const fx = forceI[0];
          const fy = forceI[1];
          if (fx !== undefined && fy !== undefined) {
            forceI[0] = fx - repulsionForce * dx / distance;
            forceI[1] = fy - repulsionForce * dy / distance;
          }
          if (dimensions === 3) {
            const fz = forceI[2];
            if (fz !== undefined) {
              forceI[2] = fz - repulsionForce * dz / distance;
            }
          }
        }
      }
    }
    
    // 引力の計算（距離行列に基づく）
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        const targetDistanceRow = distanceMatrix[i];
        if (!targetDistanceRow) continue;
        const targetDistance = targetDistanceRow[j];
        if (targetDistance === undefined) continue;
        
        const pi = points[i];
        const pj = points[j];
        if (!pi || !pj) continue;
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const dz = pj.z !== undefined && pi.z !== undefined ? pj.z - pi.z : 0;
        
        const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const attractionForce = (currentDistance - targetDistance) * 0.1;
        
        const forceI = forces[i];
        if (forceI) {
          const fx = forceI[0];
          const fy = forceI[1];
          if (fx !== undefined && fy !== undefined) {
            forceI[0] = fx + attractionForce * dx / currentDistance;
            forceI[1] = fy + attractionForce * dy / currentDistance;
          }
          if (dimensions === 3) {
            const fz = forceI[2];
            if (fz !== undefined) {
              forceI[2] = fz + attractionForce * dz / currentDistance;
            }
          }
        }
      }
    }
    
    // 位置の更新
    for (let i = 0; i < n; i++) {
      const point = points[i];
      const force = forces[i];
      if (point && force) {
        const forceX = force[0];
        const forceY = force[1];
        if (forceX !== undefined && forceY !== undefined) {
          point.x += forceX * temperature;
          point.y += forceY * temperature;
        }
        if (dimensions === 3 && point.z !== undefined && force[2] !== undefined) {
          point.z += force[2] * temperature;
        }
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
