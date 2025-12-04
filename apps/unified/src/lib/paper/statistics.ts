// Merkle DAG: lib.statistics
// Statistical calculation functions

import type { ComponentStats } from '../../types/paper/experimental';

/**
 * Calculate mean
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate median
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const val1 = sorted[mid - 1];
    const val2 = sorted[mid];
    if (val1 === undefined || val2 === undefined) return 0;
    return (val1 + val2) / 2;
  }
  const val = sorted[mid];
  return val ?? 0;
}

/**
 * Calculate component statistics
 */
export function calculateComponentStats(component: number[]): ComponentStats {
  if (component.length === 0) {
    return {
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      median: 0,
    };
  }

  const sorted = [...component].sort((a, b) => a - b);
  return {
    mean: mean(component),
    stdDev: stdDev(component),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    median: median(sorted),
  };
}

/**
 * Calculate confidence interval (95%)
 */
export function confidenceInterval(values: number[], _confidence: number = 0.95): [number, number] {
  if (values.length === 0) return [0, 0];
  const m = mean(values);
  const s = stdDev(values);
  const z = 1.96; // 95% confidence
  const margin = z * (s / Math.sqrt(values.length));
  return [m - margin, m + margin];
}

/**
 * Calculate Cohen's d (effect size)
 */
export function cohensD(group1: number[], group2: number[]): number {
  const mean1 = mean(group1);
  const mean2 = mean(group2);
  const stdDev1 = stdDev(group1);
  const stdDev2 = stdDev(group2);
  const pooledStd = Math.sqrt((stdDev1 * stdDev1 + stdDev2 * stdDev2) / 2);
  return pooledStd > 0 ? (mean1 - mean2) / pooledStd : 0;
}

