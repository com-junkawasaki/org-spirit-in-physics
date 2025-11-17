// Merkle DAG: lib.kernel_fusion
// カーネル融合（核融合）: 複数モダリティ距離→グラム行列→正規化→CKA重み学習→統合→固有分解

export type DistanceMatrixInput = {
  name: string;
  matrix: number[][]; // n x n, 対称, 0対角
  kind: 'distance' | 'similarity';
};

export type KernelFusionOptions = {
  normalization?: 'trace' | 'fro';
  nonNegativeWeights?: boolean; // 重みの非負制約
  timeKernel?: { timestamps: number[]; tau: number; weight: number } | null; // 任意の時間核
  rank?: number; // 取得する次元数（例: 2 or 3）
};

export type KernelFusionResult = {
  fusedKernel: number[][]; // n x n
  weights: number[]; // モダリティ重み（和=1）
  eigenVectors: number[][]; // n x r
  eigenValues: number[]; // r
  embedding: number[][]; // n x r （E * sqrt(Lambda)）
};

// J = I - 1/n 11^T（中心化行列）
function centeringMatrix(n: number): number[][] {
  const J = Array.from({ length: n }, () => Array(n).fill(0));
  const v = 1 / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      J[i][j] = (i === j ? 1 : 0) - v;
    }
  }
  return J;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length, m = B[0].length, kdim = B.length;
  const C = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < kdim; k++) {
      const aik = A[i][k];
      for (let j = 0; j < m; j++) C[i][j] += aik * B[k][j];
    }
  }
  return C;
}

function matAdd(A: number[][], B: number[][], alpha = 1): number[][] {
  const n = A.length, m = A[0].length;
  const C = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) C[i][j] = A[i][j] + alpha * B[i][j];
  return C;
}

function hadamard(A: number[][], B: number[][]): number[][] {
  const n = A.length, m = A[0].length;
  const C = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) C[i][j] = A[i][j] * B[i][j];
  return C;
}

function transpose(A: number[][]): number[][] {
  const n = A.length, m = A[0].length;
  const T = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) T[j][i] = A[i][j];
  return T;
}

function identity(n: number): number[][] {
  const I = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

function trace(A: number[][]): number {
  let t = 0; for (let i = 0; i < A.length; i++) t += A[i][i]; return t;
}

function froNorm(A: number[][]): number {
  let s = 0; for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) s += A[i][j] * A[i][j];
  return Math.sqrt(s);
}

// 二重中心化: K = -1/2 J (D ⊙ D) J
export function doubleCenterToKernel(D: number[][]): number[][] {
  const n = D.length;
  const J = centeringMatrix(n);
  const D2 = hadamard(D, D);
  const JD2 = matMul(J, D2);
  const JD2J = matMul(JD2, J);
  const K = JD2J.map(row => row.map(v => -0.5 * v));
  return K;
}

// 類似度行列の中心化: Kc = J R J
export function centerSimilarity(R: number[][]): number[][] {
  const n = R.length;
  const J = centeringMatrix(n);
  return matMul(matMul(J, R), J);
}

// 正規化: trace または Frobenius
export function normalizeKernel(K: number[][], method: 'trace' | 'fro' = 'trace'): number[][] {
  const denom = method === 'trace' ? (trace(K) || 1) : (froNorm(K) || 1);
  return K.map(row => row.map(v => v / denom));
}

// CKA行列（各正規化済みカーネルの内積）
export function kernelCKAMatrix(kernels: number[][][]): number[][] {
  const M = kernels.length;
  const G = Array.from({ length: M }, () => Array(M).fill(0));
  for (let a = 0; a < M; a++) {
    for (let b = 0; b < M; b++) {
      let s = 0;
      const Ka = kernels[a], Kb = kernels[b];
      const n = Ka.length;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += Ka[i][j] * Kb[i][j];
      G[a][b] = s;
    }
  }
  return G;
}

// 行列の最大固有ベクトル（パワー法）
export function topEigenvectorSym(A: number[][], nonNegative = true): number[] {
  const n = A.length;
  let v = Array(n).fill(1 / Math.sqrt(n));
  for (let it = 0; it < 200; it++) {
    const Av = Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Av[i] += A[i][j] * v[j];
    const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0)) || 1;
    v = Av.map(x => x / norm);
  }
  if (nonNegative) {
    // 非負射影
    v = v.map(x => Math.max(0, x));
    const s = v.reduce((a, b) => a + b, 0) || 1;
    v = v.map(x => x / s);
  } else {
    // 和=1へ正規化（符号は保持）
    const s = v.reduce((a, b) => a + Math.abs(b), 0) || 1;
    v = v.map(x => Math.abs(x) / s);
  }
  return v;
}

// 固有分解（対称行列, 上位r）: 簡易パワー反復 + 逐次直交
export function topEigenDecomposition(K: number[][], r: number): { vectors: number[][]; values: number[] } {
  const n = K.length;
  const V: number[][] = Array.from({ length: n }, () => Array(r).fill(0));
  const L: number[] = Array(r).fill(0);
  let R = K.map(row => row.slice());

  for (let d = 0; d < r; d++) {
    // 初期ベクトル
    let v = Array(n).fill(0).map(() => Math.random() - 0.5);
    // パワー反復
    for (let it = 0; it < 200; it++) {
      let Av = Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Av[i] += R[i][j] * v[j];
      // 直交化
      for (let p = 0; p < d; p++) {
        let dot = 0; for (let i = 0; i < n; i++) dot += Av[i] * V[i][p];
        for (let i = 0; i < n; i++) Av[i] -= dot * V[i][p];
      }
      const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0)) || 1;
      v = Av.map(x => x / norm);
    }
    // レイリー商で固有値近似
    let lambda = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) lambda += v[i] * K[i][j] * v[j];
    // クリップ（負固有値→0）
    lambda = Math.max(0, lambda);
    // ベクトル保存
    for (let i = 0; i < n; i++) V[i][d] = v[i];
    L[d] = lambda;
    // デフレーション（ランク1除去）
    const outer = V.map((row, i) => row.map((_, j) => V[i][d] * V[j][d]));
    const scaledOuter = outer.map(row => row.map(vv => vv * lambda));
    R = matAdd(R, scaledOuter, -1);
  }

  return { vectors: V, values: L };
}

// オプションの時間核 K_time(i,j) = exp(-|ti - tj| / tau)
function buildTimeKernel(timestamps: number[], tau: number): number[][] {
  const n = timestamps.length;
  const Kt = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const d = Math.abs(timestamps[i] - timestamps[j]);
      Kt[i][j] = Math.exp(-d / Math.max(1e-6, tau));
    }
  }
  // 中心化
  return centerSimilarity(Kt);
}

// メイン: カーネル融合
export function fuseKernels(
  inputs: DistanceMatrixInput[],
  options: KernelFusionOptions = {}
): KernelFusionResult {
  if (inputs.length === 0) throw new Error('No inputs for kernel fusion');
  const n = inputs[0].matrix.length;
  const norm = options.normalization ?? 'trace';
  const r = Math.max(1, options.rank ?? 3);

  // 1) 各モダリティをグラム行列へ
  const kernels: number[][][] = inputs.map(inp => {
    if (inp.kind === 'distance') return doubleCenterToKernel(inp.matrix);
    return centerSimilarity(inp.matrix);
  });

  // 2) 正規化
  const kernelsNorm = kernels.map(K => normalizeKernel(K, norm));

  // 3) CKA行列→最大固有ベクトルで重み推定
  const G = kernelCKAMatrix(kernelsNorm);
  let w = topEigenvectorSym(G, options.nonNegativeWeights !== false);

  // 正規化（和=1）
  const sumw = w.reduce((a, b) => a + b, 0) || 1;
  w = w.map(x => x / sumw);

  // 4) 統合カーネル K = Σ_m w_m K~(m)
  let Kf = Array.from({ length: n }, () => Array(n).fill(0));
  for (let m = 0; m < kernelsNorm.length; m++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) Kf[i][j] += w[m] * kernelsNorm[m][i][j];
    }
  }

  // 5) 時間核があれば小重みで加算
  if (options.timeKernel) {
    const Kt = buildTimeKernel(options.timeKernel.timestamps, options.timeKernel.tau);
    const wt = options.timeKernel.weight;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Kf[i][j] += wt * Kt[i][j];
  }

  // 6) 固有分解→埋め込み座標
  const { vectors: E, values: L } = topEigenDecomposition(Kf, r);
  const embedding = Array.from({ length: n }, () => Array(r).fill(0));
  for (let i = 0; i < n; i++) {
    for (let d = 0; d < r; d++) {
      embedding[i][d] = E[i][d] * Math.sqrt(Math.max(0, L[d]));
    }
  }

  return {
    fusedKernel: Kf,
    weights: w,
    eigenVectors: E,
    eigenValues: L,
    embedding,
  };
}


