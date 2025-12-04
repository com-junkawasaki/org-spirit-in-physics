// Merkle DAG: lib.dimensionality_reduction
// Dimensionality reduction algorithms for Complex space visualization (1024d → 3d)

/**
 * Principal Component Analysis (PCA)
 * Reduces high-dimensional vectors to 3D coordinates
 */
export function pca(
  vectors: number[][],
  targetDimensions: number = 3
): number[][] {
  if (vectors.length === 0) return [];
  const firstVector = vectors[0];
  if (!firstVector || firstVector.length === 0) return [];

  const dimension = firstVector.length;
  const n = vectors.length;

  // Center the data (subtract mean)
  const mean = Array(dimension).fill(0);
  vectors.forEach(v => {
    v.forEach((val, i) => {
      mean[i] += val;
    });
  });
  mean.forEach((val, i) => {
    mean[i] = val / n;
  });

  const centered = vectors.map(v => v.map((val, i) => val - mean[i]));

  // Compute covariance matrix
  const covariance: number[][] = Array(dimension).fill(null).map(() => Array(dimension).fill(0));
  centered.forEach(v => {
    for (let i = 0; i < dimension; i++) {
      for (let j = 0; j < dimension; j++) {
        const vI = v[i] ?? 0;
        const vJ = v[j] ?? 0;
        const covRow = covariance[i];
        if (covRow) {
          covRow[j] = (covRow[j] ?? 0) + vI * vJ;
        }
      }
    }
  });
  for (let i = 0; i < dimension; i++) {
    const covRow = covariance[i];
    if (covRow) {
      for (let j = 0; j < dimension; j++) {
        covRow[j] = (covRow[j] ?? 0) / (n - 1);
      }
    }
  }

  // Compute eigenvalues and eigenvectors (simplified - using power iteration)
  // For production, use a proper eigenvalue decomposition library
  const eigenvectors: number[][] = [];
  const eigenvalues: number[] = [];

  // Simplified: Use first targetDimensions principal components
  // In production, use proper eigenvalue decomposition
  for (let d = 0; d < targetDimensions; d++) {
    // Initialize eigenvector
    let eigenvector = Array(dimension).fill(1 / Math.sqrt(dimension));
    
    // Power iteration (simplified)
    for (let iter = 0; iter < 10; iter++) {
      const newEigenvector = Array(dimension).fill(0);
      for (let i = 0; i < dimension; i++) {
        const covRow = covariance[i];
        if (covRow) {
          for (let j = 0; j < dimension; j++) {
            const covVal = covRow[j] ?? 0;
            const eigenValJ = eigenvector[j] ?? 0;
            newEigenvector[i] = (newEigenvector[i] ?? 0) + covVal * eigenValJ;
          }
        }
      }
      // Normalize
      const norm = Math.sqrt(newEigenvector.reduce((sum, val) => sum + val * val, 0));
      eigenvector = newEigenvector.map(val => val / norm);
    }

    eigenvectors.push(eigenvector);
    
    // Compute eigenvalue
    let eigenvalue = 0;
    for (let i = 0; i < dimension; i++) {
      let sum = 0;
      for (let j = 0; j < dimension; j++) {
        const covVal = covariance[i]?.[j] ?? 0;
        const eigenVal = eigenvector[j] ?? 0;
        sum += covVal * eigenVal;
      }
      eigenvalue += eigenvector[i] * sum;
    }
    eigenvalues.push(eigenvalue);
  }

  // Project data onto principal components
  const projected = centered.map(v => {
    const result: number[] = [];
      for (let d = 0; d < targetDimensions; d++) {
        let projection = 0;
        for (let i = 0; i < dimension; i++) {
          const vVal = v[i] ?? 0;
          const eigenVal = eigenvectors[d]?.[i] ?? 0;
          projection += vVal * eigenVal;
        }
        result.push(projection);
      }
    return result;
  });

  return projected;
}

/**
 * UMAP (Uniform Manifold Approximation and Projection)
 * Simplified implementation - for production, use a proper UMAP library
 * 
 * This is a placeholder implementation. For production use:
 * - umap-js (JavaScript UMAP implementation)
 * - Or call a Python UMAP service via API
 */
export function umap(
  vectors: number[][],
  targetDimensions: number = 3,
  _nNeighbors: number = 15,
  _minDist: number = 0.1
): number[][] {
  if (vectors.length === 0) return [];
  const firstVector = vectors[0];
  if (!firstVector || firstVector.length === 0) return [];

  // Simplified UMAP: Use PCA as fallback
  // In production, implement proper UMAP algorithm or use library
  console.warn('Using PCA as UMAP fallback. For production, use proper UMAP implementation.');
  return pca(vectors, targetDimensions);
}

/**
 * Project 1024-dimensional Complex space vectors to 3D
 */
export function projectComplexSpaceTo3D(
  vectors: number[][],
  method: 'pca' | 'umap' = 'pca'
): number[][] {
  if (vectors.length === 0) return [];
  
  // Validate vector dimensions
  const firstVector = vectors[0];
  if (!firstVector) return [];
  const dimension = firstVector.length;
  if (dimension !== 1024) {
    console.warn(`Expected 1024-dimensional vectors, got ${dimension}-dimensional. Padding or truncating.`);
    vectors = vectors.map(v => {
      if (v.length < 1024) {
        return [...v, ...Array(1024 - v.length).fill(0)];
      } else if (v.length > 1024) {
        return v.slice(0, 1024);
      }
      return v;
    });
  }

  if (method === 'umap') {
    return umap(vectors, 3);
  } else {
    return pca(vectors, 3);
  }
}

/**
 * Scale 3D coordinates to fit visualization bounds
 */
export function scale3DCoordinates(
  coordinates: number[][],
  bounds: { min: number; max: number } = { min: -200, max: 200 }
): number[][] {
  if (coordinates.length === 0) return [];

  // Find min/max for each dimension
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];

  coordinates.forEach(coord => {
    coord.forEach((val, dim) => {
      const currentMin = mins[dim] ?? Infinity;
      const currentMax = maxs[dim] ?? -Infinity;
      mins[dim] = Math.min(currentMin, val);
      maxs[dim] = Math.max(currentMax, val);
    });
  });

  // Scale to bounds
  return coordinates.map(coord => {
    return coord.map((val, dim) => {
      const maxVal = maxs[dim] ?? 0;
      const minVal = mins[dim] ?? 0;
      const range = maxVal - minVal;
      if (range === 0) return 0;
      const normalized = (val - minVal) / range;
      return bounds.min + normalized * (bounds.max - bounds.min);
    });
  });
}

