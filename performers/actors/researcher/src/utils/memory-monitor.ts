// Merkle DAG: utils.memory_monitor
// メモリ使用量監視ユーティリティ
// ループや計算処理で一定以上のメモリを使用した場合に詳細なエラーを表示して停止

interface MemoryMonitorOptions {
  maxMemoryMB?: number // 最大メモリ使用量（MB）
  checkInterval?: number // チェック間隔（ms）
  onExceeded?: (info: MemoryInfo) => void // 閾値超過時のコールバック
}

interface MemoryInfo {
  usedJSHeapSize: number // 使用中のヒープサイズ（bytes）
  totalJSHeapSize: number // 総ヒープサイズ（bytes）
  jsHeapSizeLimit: number // ヒープサイズ制限（bytes）
  usedMB: number // 使用中メモリ（MB）
  totalMB: number // 総メモリ（MB）
  limitMB: number // メモリ制限（MB）
  usagePercent: number // 使用率（%）
}

interface PerformanceMemory {
  usedJSHeapSize?: number
  totalJSHeapSize?: number
  jsHeapSizeLimit?: number
}

declare global {
  interface Performance {
    memory?: PerformanceMemory
  }
}

/**
 * メモリ情報を取得
 */
export function getMemoryInfo(): MemoryInfo | null {
  if (typeof performance === 'undefined' || !performance.memory) {
    return null
  }

  const mem = performance.memory
  const usedJSHeapSize = mem.usedJSHeapSize || 0
  const totalJSHeapSize = mem.totalJSHeapSize || 0
  const jsHeapSizeLimit = mem.jsHeapSizeLimit || 0

  return {
    usedJSHeapSize,
    totalJSHeapSize,
    jsHeapSizeLimit,
    usedMB: usedJSHeapSize / (1024 * 1024),
    totalMB: totalJSHeapSize / (1024 * 1024),
    limitMB: jsHeapSizeLimit / (1024 * 1024),
    usagePercent: jsHeapSizeLimit > 0 ? (usedJSHeapSize / jsHeapSizeLimit) * 100 : 0
  }
}

/**
 * メモリ監視クラス
 */
export class MemoryMonitor {
  private maxMemoryMB: number
  private checkInterval: number
  private intervalId: number | null = null
  private onExceeded: ((info: MemoryInfo) => void) | null = null
  private lastCheckTime: number = 0
  private checkCount: number = 0

  constructor(options: MemoryMonitorOptions = {}) {
    this.maxMemoryMB = options.maxMemoryMB || 500 // デフォルト500MB
    this.checkInterval = options.checkInterval || 1000 // デフォルト1秒
    this.onExceeded = options.onExceeded || null
  }

  /**
   * メモリ監視を開始
   */
  start(): void {
    if (this.intervalId !== null) {
      console.warn('[MemoryMonitor] Already started')
      return
    }

    if (!this.isAvailable()) {
      console.warn('[MemoryMonitor] Performance.memory is not available')
      return
    }

    this.lastCheckTime = performance.now()
    this.checkCount = 0

    const check = () => {
      const info = getMemoryInfo()
      if (!info) return

      this.checkCount++
      const now = performance.now()
      const elapsed = now - this.lastCheckTime

      // メモリ使用量が閾値を超えた場合
      if (info.usedMB > this.maxMemoryMB) {
        const errorInfo = this.createErrorInfo(info, elapsed)
        console.error('[MemoryMonitor] Memory limit exceeded:', errorInfo)
        
        if (this.onExceeded) {
          this.onExceeded(info)
        } else {
          // デフォルトのエラー処理
          this.handleDefaultError(errorInfo)
        }
        
        this.stop()
        return
      }

      // 使用率が90%を超えた場合も警告
      if (info.usagePercent > 90) {
        console.warn('[MemoryMonitor] High memory usage:', {
          usedMB: info.usedMB.toFixed(2),
          limitMB: info.limitMB.toFixed(2),
          usagePercent: info.usagePercent.toFixed(2) + '%'
        })
      }
    }

    // 初回チェック
    check()

    // 定期的なチェック
    this.intervalId = window.setInterval(check, this.checkInterval)
  }

  /**
   * メモリ監視を停止
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * メモリ監視が利用可能かどうか
   */
  isAvailable(): boolean {
    return typeof performance !== 'undefined' && 
           performance.memory !== undefined &&
           performance.memory !== null
  }

  /**
   * エラー情報を作成
   */
  private createErrorInfo(info: MemoryInfo, elapsed: number): string {
    return `
[MemoryMonitor] Memory Limit Exceeded

Memory Usage:
  Used: ${info.usedMB.toFixed(2)} MB
  Total: ${info.totalMB.toFixed(2)} MB
  Limit: ${info.limitMB.toFixed(2)} MB
  Usage: ${info.usagePercent.toFixed(2)}%

Threshold:
  Max Allowed: ${this.maxMemoryMB} MB
  Exceeded By: ${(info.usedMB - this.maxMemoryMB).toFixed(2)} MB

Monitoring:
  Checks Performed: ${this.checkCount}
  Time Elapsed: ${elapsed.toFixed(2)} ms
  Check Interval: ${this.checkInterval} ms

Recommendations:
  - Reduce data size
  - Optimize calculations
  - Clear unused references
  - Check for memory leaks
    `.trim()
  }

  /**
   * デフォルトのエラー処理
   */
  private handleDefaultError(errorInfo: string): void {
    // エラーをスローして処理を停止
    const error = new Error(errorInfo)
    error.name = 'MemoryLimitExceededError'
    throw error
  }

  /**
   * 現在のメモリ情報を取得
   */
  getCurrentMemoryInfo(): MemoryInfo | null {
    return getMemoryInfo()
  }
}

/**
 * メモリ使用量をチェックし、閾値を超えている場合はエラーをスロー
 */
export function checkMemoryUsage(maxMemoryMB: number = 500): void {
  const info = getMemoryInfo()
  if (!info) return

  if (info.usedMB > maxMemoryMB) {
    const error = new Error(
      `Memory usage exceeded limit: ${info.usedMB.toFixed(2)} MB > ${maxMemoryMB} MB\n` +
      `Usage: ${info.usagePercent.toFixed(2)}% of ${info.limitMB.toFixed(2)} MB limit`
    )
    error.name = 'MemoryLimitExceededError'
    throw error
  }
}

/**
 * ループ処理用のメモリチェックヘルパー
 */
export function createMemoryCheck(maxMemoryMB: number = 500, checkEvery: number = 100): () => void {
  let iterationCount = 0
  
  return () => {
    iterationCount++
    if (iterationCount % checkEvery === 0) {
      checkMemoryUsage(maxMemoryMB)
    }
  }
}

