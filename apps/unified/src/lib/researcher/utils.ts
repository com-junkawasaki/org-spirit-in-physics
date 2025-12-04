import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import * as v from 'valibot'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals)
}

export function formatPercentage(num: number, decimals: number = 1): string {
  return `${(num * 100).toFixed(decimals)}%`
}

export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(2)}s`
}

export function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    joy: '#FFD700',
    sadness: '#4169E1',
    anger: '#DC143C',
    fear: '#800080',
    surprise: '#FFA500',
    disgust: '#8B4513',
    neutral: '#808080',
    unknown: '#A9A9A9'
  }
  const lowerEmotion = emotion.toLowerCase();
  return colors[lowerEmotion] ?? colors.unknown ?? '#A9A9A9'
}

export function calculateStats(data: number[]): {
  min: number
  max: number
  mean: number
  median: number
  std: number
} {
  if (data.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, std: 0 }
  }

  const sorted = [...data].sort((a, b) => a - b)
  const min = sorted[0] ?? 0
  const max = sorted[sorted.length - 1] ?? 0
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length
  const median = sorted.length % 2 === 0
    ? ((sorted[sorted.length / 2 - 1] ?? 0) + (sorted[sorted.length / 2] ?? 0)) / 2
    : (sorted[Math.floor(sorted.length / 2)] ?? 0)
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  const std = Math.sqrt(variance)

  return { min, max, mean, median, std }
}

// Merkle DAG: validation.consent_schema -> consent_data_validation
export const consentDataSchema = v.object({
  participantId: v.string('participantId must be a string'),
  signature: v.string('signature must be a string'),
  agreements: v.object({
    understand: v.boolean('understand must be a boolean'),
    voluntary: v.boolean('voluntary must be a boolean'),
    withdraw: v.boolean('withdraw must be a boolean'),
    recording: v.boolean('recording must be a boolean')
  }),
  agreedAt: v.string('agreedAt must be a string')
})
