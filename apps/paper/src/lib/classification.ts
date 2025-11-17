// Merkle DAG: lib.classification
// Spirit Type / Ghost Pattern classification algorithms

import type { AnalysisResult, SpiritType, GhostPattern } from '../types/experimental';

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB || 1);
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
}

/**
 * Simple K-means clustering for Spirit Type classification
 */
export function kMeansClustering(
  vectors: number[][],
  k: number,
  maxIterations: number = 100
): { clusters: number[][]; labels: number[] } {
  if (vectors.length === 0) return { clusters: [], labels: [] };
  if (k > vectors.length) k = vectors.length;

  // Initialize centroids randomly
  const centroids: number[][] = [];
  const dimension = vectors[0].length;
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * vectors.length);
    centroids.push([...vectors[randomIndex]]);
  }

  let labels: number[] = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    // Assign points to nearest centroid
    labels = vectors.map(vector => {
      let minDistance = Infinity;
      let nearestCluster = 0;
      centroids.forEach((centroid, idx) => {
        const distance = euclideanDistance(vector, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCluster = idx;
        }
      });
      return nearestCluster;
    });

    // Update centroids
    const newCentroids: number[][] = Array(k).fill(null).map(() => Array(dimension).fill(0));
    const clusterCounts = Array(k).fill(0);

    vectors.forEach((vector, idx) => {
      const cluster = labels[idx];
      clusterCounts[cluster]++;
      vector.forEach((val, dim) => {
        newCentroids[cluster][dim] += val;
      });
    });

    // Check convergence
    let converged = true;
    newCentroids.forEach((centroid, idx) => {
      if (clusterCounts[idx] > 0) {
        centroid.forEach((val, dim) => {
          centroid[dim] = val / clusterCounts[idx];
        });
        if (euclideanDistance(centroid, centroids[idx]) > 0.001) {
          converged = false;
        }
      }
    });

    if (converged) break;
    centroids.splice(0, centroids.length, ...newCentroids);
    iterations++;
  }

  return { clusters: centroids, labels };
}

/**
 * Isolation Forest for Ghost Pattern detection
 * Simplified version: detect outliers based on distance from Spirit Type clusters
 */
export function detectGhostPatterns(
  vectors: number[][],
  spiritTypeClusters: number[][],
  contamination: number = 0.1
): boolean[] {
  if (vectors.length === 0) return [];
  if (spiritTypeClusters.length === 0) return vectors.map(() => true);

  // Calculate minimum distance to any Spirit Type cluster
  const distances = vectors.map(vector => {
    const minDistance = Math.min(
      ...spiritTypeClusters.map(cluster => euclideanDistance(vector, cluster))
    );
    return minDistance;
  });

  // Sort distances and find threshold
  const sortedDistances = [...distances].sort((a, b) => a - b);
  const thresholdIndex = Math.floor(sortedDistances.length * (1 - contamination));
  const threshold = sortedDistances[thresholdIndex] || sortedDistances[sortedDistances.length - 1];

  // Mark as Ghost Pattern if distance exceeds threshold
  return distances.map(distance => distance > threshold);
}

/**
 * Classify Spirit Type vs Ghost Pattern
 */
export function classifySpiritTypeAndGhostPattern(
  vectors: number[][],
  archetypeVector: number[],
  thresholdType: number = 1.0
): { isSpiritType: boolean[]; isGhostPattern: boolean[] } {
  const isSpiritType = vectors.map(vector => {
    const distance = euclideanDistance(vector, archetypeVector);
    return distance < thresholdType;
  });

  const isGhostPattern = isSpiritType.map(isType => !isType);

  return { isSpiritType, isGhostPattern };
}

