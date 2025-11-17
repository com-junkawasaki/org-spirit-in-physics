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
  if (vectors[0].length === 0) return [];

  const dimension = vectors[0].length;
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
        covariance[i][j] += v[i] * v[j];
      }
    }
  });
  for (let i = 0; i < dimension; i++) {
    for (let j = 0; j < dimension; j++) {
      covariance[i][j] /= (n - 1);
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
        for (let j = 0; j < dimension; j++) {
          newEigenvector[i] += covariance[i][j] * eigenvector[j];
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
        sum += covariance[i][j] * eigenvector[j];
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
        projection += v[i] * eigenvectors[d][i];
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
  nNeighbors: number = 15,
  minDist: number = 0.1
): number[][] {
  if (vectors.length === 0) return [];
  if (vectors[0].length === 0) return [];

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
  const dimension = vectors[0].length;
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
      mins[dim] = Math.min(mins[dim], val);
      maxs[dim] = Math.max(maxs[dim], val);
    });
  });

  // Scale to bounds
  return coordinates.map(coord => {
    return coord.map((val, dim) => {
      const range = maxs[dim] - mins[dim];
      if (range === 0) return 0;
      const normalized = (val - mins[dim]) / range;
      return bounds.min + normalized * (bounds.max - bounds.min);
    });
  });
}

