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
    const row = J[i];
    if (row) {
      for (let j = 0; j < n; j++) {
        row[j] = (i === j ? 1 : 0) - v;
      }
    }
  }
  return J;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const firstRowB = B[0];
  if (!firstRowB) return [];
  const m = firstRowB.length;
  const kdim = B.length;
  const C = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    const aRow = A[i];
    const cRow = C[i];
    if (!aRow || !cRow) continue;
    for (let k = 0; k < kdim; k++) {
      const aik = aRow[k];
      const bRow = B[k];
      if (aik !== undefined && bRow) {
        for (let j = 0; j < m; j++) {
          const bValue = bRow[j];
          if (bValue !== undefined) {
            cRow[j] = (cRow[j] ?? 0) + aik * bValue;
          }
        }
      }
    }
  }
  return C;
}

function matAdd(A: number[][], B: number[][], alpha = 1): number[][] {
  const n = A.length;
  const firstRowA = A[0];
  if (!firstRowA) return [];
  const m = firstRowA.length;
  const C = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    const aRow = A[i];
    const bRow = B[i];
    const cRow = C[i];
    if (aRow && bRow && cRow) {
      for (let j = 0; j < m; j++) {
        const aValue = aRow[j];
        const bValue = bRow[j];
        if (aValue !== undefined && bValue !== undefined) {
          cRow[j] = aValue + alpha * bValue;
        }
      }
    }
  }
  return C;
}

function hadamard(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const firstRowA = A[0];
  if (!firstRowA) return [];
  const m = firstRowA.length;
  const C = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    const aRow = A[i];
    const bRow = B[i];
    const cRow = C[i];
    if (aRow && bRow && cRow) {
      for (let j = 0; j < m; j++) {
        const aValue = aRow[j];
        const bValue = bRow[j];
        if (aValue !== undefined && bValue !== undefined) {
          cRow[j] = aValue * bValue;
        }
      }
    }
  }
  return C;
}

// @ts-expect-error - Unused function, kept for future use
function transpose(A: number[][]): number[][] {
  const n = A.length;
  const firstRow = A[0];
  if (!firstRow) return [];
  const m = firstRow.length;
  const T = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const aRow = A[i];
    if (aRow) {
      for (let j = 0; j < m; j++) {
        const tRow = T[j];
        const aValue = aRow[j];
        if (tRow && aValue !== undefined) {
          tRow[i] = aValue;
        }
      }
    }
  }
  return T;
}

// @ts-expect-error - Unused function, kept for future use
function identity(n: number): number[][] {
  const I = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const row = I[i];
    if (row) {
      row[i] = 1;
    }
  }
  return I;
}

function trace(A: number[][]): number {
  let t = 0;
  for (let i = 0; i < A.length; i++) {
    const row = A[i];
    const value = row?.[i];
    if (value !== undefined) {
      t += value;
    }
  }
  return t;
}

function froNorm(A: number[][]): number {
  let s = 0;
  const firstRow = A[0];
  if (!firstRow) return 0;
  const m = firstRow.length;
  for (let i = 0; i < A.length; i++) {
    const row = A[i];
    if (row) {
      for (let j = 0; j < m; j++) {
        const value = row[j];
        if (value !== undefined) {
          s += value * value;
        }
      }
    }
  }
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
      const Ka = kernels[a];
      const Kb = kernels[b];
      if (!Ka || !Kb) continue;
      const n = Ka.length;
      for (let i = 0; i < n; i++) {
        const kaRow = Ka[i];
        const kbRow = Kb[i];
        if (kaRow && kbRow) {
          for (let j = 0; j < n; j++) {
            const kaValue = kaRow[j];
            const kbValue = kbRow[j];
            if (kaValue !== undefined && kbValue !== undefined) {
              s += kaValue * kbValue;
            }
          }
        }
      }
      const gRow = G[a];
      if (gRow) {
        gRow[b] = s;
      }
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
    for (let i = 0; i < n; i++) {
      const aRow = A[i];
      if (aRow) {
        for (let j = 0; j < n; j++) {
          const aValue = aRow[j];
          const vValue = v[j];
          if (aValue !== undefined && vValue !== undefined) {
            Av[i] = (Av[i] ?? 0) + aValue * vValue;
          }
        }
      }
    }
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
      for (let i = 0; i < n; i++) {
        const rRow = R[i];
        if (rRow) {
          for (let j = 0; j < n; j++) {
            const rValue = rRow[j];
            const vValue = v[j];
            if (rValue !== undefined && vValue !== undefined) {
              Av[i] = (Av[i] ?? 0) + rValue * vValue;
            }
          }
        }
      }
      // 直交化
      for (let p = 0; p < d; p++) {
        let dot = 0;
        for (let i = 0; i < n; i++) {
          const avValue = Av[i];
          const vValue = V[i]?.[p];
          if (avValue !== undefined && vValue !== undefined) {
            dot += avValue * vValue;
          }
        }
        for (let i = 0; i < n; i++) {
          const avValue = Av[i];
          const vValue = V[i]?.[p];
          if (avValue !== undefined && vValue !== undefined) {
            Av[i] = avValue - dot * vValue;
          }
        }
      }
      const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0)) || 1;
      v = Av.map(x => x / norm);
    }
    // レイリー商で固有値近似
    let lambda = 0;
    for (let i = 0; i < n; i++) {
      const vi = v[i];
      const kRow = K[i];
      if (vi !== undefined && kRow) {
        for (let j = 0; j < n; j++) {
          const vj = v[j];
          const kValue = kRow[j];
          if (vj !== undefined && kValue !== undefined) {
            lambda += vi * kValue * vj;
          }
        }
      }
    }
    // クリップ（負固有値→0）
    lambda = Math.max(0, lambda);
    // ベクトル保存
    for (let i = 0; i < n; i++) {
      const row = V[i];
      const vValue = v[i];
      if (row && vValue !== undefined) {
        row[d] = vValue;
      }
    }
    L[d] = lambda;
    // デフレーション（ランク1除去）
    const outer = V.map((row) => {
      const vi = row[d];
      if (vi === undefined) return row.map(() => 0);
      return row.map((_, j) => {
        const vj = V[j]?.[d];
        return vj !== undefined ? vi * vj : 0;
      });
    });
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
    const row = Kt[i];
    const tsI = timestamps[i];
    if (!row || tsI === undefined) continue;
    for (let j = 0; j < n; j++) {
      const tsJ = timestamps[j];
      if (tsJ !== undefined) {
        const d = Math.abs(tsI - tsJ);
        row[j] = Math.exp(-d / Math.max(1e-6, tau));
      }
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
  const firstInput = inputs[0];
  if (!firstInput) {
    throw new Error('At least one input matrix is required');
  }
  const n = firstInput.matrix.length;
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
    const kernel = kernelsNorm[m];
    const weight = w[m];
    if (!kernel || weight === undefined) continue;
    for (let i = 0; i < n; i++) {
      const kfRow = Kf[i];
      const kernelRow = kernel[i];
      if (!kfRow || !kernelRow) continue;
      for (let j = 0; j < n; j++) {
        const kernelValue = kernelRow[j];
        if (kernelValue !== undefined) {
          kfRow[j] = (kfRow[j] ?? 0) + weight * kernelValue;
        }
      }
    }
  }

  // 5) 時間核があれば小重みで加算
  if (options.timeKernel) {
    const Kt = buildTimeKernel(options.timeKernel.timestamps, options.timeKernel.tau);
    const wt = options.timeKernel.weight;
    for (let i = 0; i < n; i++) {
      const kfRow = Kf[i];
      const ktRow = Kt[i];
      if (kfRow && ktRow) {
        for (let j = 0; j < n; j++) {
          const kfValue = kfRow[j];
          const ktValue = ktRow[j];
          if (ktValue !== undefined) {
            kfRow[j] = (kfValue ?? 0) + wt * ktValue;
          }
        }
      }
    }
  }

  // 6) 固有分解→埋め込み座標
  const { vectors: E, values: L } = topEigenDecomposition(Kf, r);
  const embedding = Array.from({ length: n }, () => Array(r).fill(0));
  for (let i = 0; i < n; i++) {
    const row = embedding[i];
    const eigenRow = E[i];
    if (!row || !eigenRow) continue;
    for (let d = 0; d < r; d++) {
      const eigenValue = L[d];
      const eigenVectorValue = eigenRow[d];
      if (eigenValue !== undefined && eigenVectorValue !== undefined) {
        row[d] = eigenVectorValue * Math.sqrt(Math.max(0, eigenValue));
      }
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


