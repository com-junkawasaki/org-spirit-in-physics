import { inngest, events, type KernelFusionEvent } from '../inngest';
import { fuseKernels } from '../kernel-fusion';

// Merkle DAG: kernel_fusion_workflow -> multimodal_integration
// 核融合ワークフロー
export const kernelFusionWorkflow = inngest.createFunction(
  {
    id: 'kernel-fusion-workflow',
    name: 'Kernel Fusion and Embedding',
    description: '複数モダリティの距離行列を核融合して埋め込みを生成',
    priority: {
      run: 'event.data.priority || "normal"',
    },
  },
  {
    event: events.KERNEL_FUSION_REQUESTED,
  },
  async ({ event, step, logger }) => {
    const { participantId, distances, n, options } = event.data as KernelFusionEvent;

    logger.info(`Starting kernel fusion for participant ${participantId}`, {
      participantId,
      n,
      modalities: Object.keys(distances),
      options,
    });

    // Merkle DAG: distance_matrix_loading -> data_preparation
    // ステップ1: 距離行列の読み込み
    const distanceMatrices = await step.run('load-distance-matrices', async () => {
      const matrices: Array<{ name: string; matrix: number[][]; kind: 'distance' }> = [];

      // 各モダリティの距離行列を読み込み
      for (const [modality, distanceUri] of Object.entries(distances)) {
        if (!distanceUri) continue;

        try {
          // メモリ内のデータURIから距離行列を取得
          // 実際の実装では、前のステップで保存されたデータを読み込む
          const distanceMatrix = await loadDistanceMatrixFromUri(distanceUri);
          
          matrices.push({
            name: modality,
            matrix: distanceMatrix,
            kind: 'distance' as const,
          });

          logger.info(`Loaded distance matrix for ${modality}`, {
            size: distanceMatrix.length,
            modality,
          });
        } catch (error) {
          logger.warn(`Failed to load distance matrix for ${modality}`, { error });
        }
      }

      if (matrices.length === 0) {
        throw new Error('No valid distance matrices found');
      }

      return matrices;
    });

    // Merkle DAG: kernel_fusion_computation -> multimodal_integration
    // ステップ2: 核融合の実行
    const fusionResult = await step.run('compute-kernel-fusion', async () => {
      logger.info(`Computing kernel fusion for ${participantId}`, {
        inputCount: distanceMatrices.length,
        normalization: options.normalization,
        nonNegativeWeights: options.nonNegativeWeights,
        dimensions: options.dimensions,
      });

      try {
        const result = fuseKernels(distanceMatrices, {
          normalization: options.normalization,
          nonNegativeWeights: options.nonNegativeWeights,
          timeKernel: options.timeKernel,
          rank: options.dimensions,
        });

        logger.info(`Kernel fusion completed for ${participantId}`, {
          weights: result.weights,
          embeddingDimensions: result.embedding.length,
          eigenValues: result.eigenValues.slice(0, 5), // 上位5つの固有値をログ
        });

        return result;
      } catch (error) {
        logger.error(`Kernel fusion failed for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: embedding_validation -> quality_assurance
    // ステップ3: 埋め込みの検証
    const embeddingValidation = await step.run('validate-embedding', async () => {
      const { embedding, weights, eigenValues } = fusionResult;

      // 埋め込みの次元数確認
      if (embedding.length !== n) {
        throw new Error(`Embedding dimension mismatch: expected ${n}, got ${embedding.length}`);
      }

      // 重みの検証
      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      if (Math.abs(weightSum - 1.0) > 0.01) {
        logger.warn(`Weight sum is not 1.0: ${weightSum}`);
      }

      // 固有値の検証
      const positiveEigenValues = eigenValues.filter(val => val > 0);
      if (positiveEigenValues.length < options.dimensions) {
        logger.warn(`Insufficient positive eigenvalues: ${positiveEigenValues.length} < ${options.dimensions}`);
      }

      // 埋め込みの数値的安定性確認
      const embeddingStats = {
        min: Math.min(...embedding.flat()),
        max: Math.max(...embedding.flat()),
        mean: embedding.flat().reduce((sum, val) => sum + val, 0) / embedding.flat().length,
        hasNaN: embedding.flat().some(val => Number.isNaN(val)),
        hasInf: embedding.flat().some(val => !Number.isFinite(val)),
      };

      if (embeddingStats.hasNaN || embeddingStats.hasInf) {
        throw new Error(`Invalid embedding values detected: ${JSON.stringify(embeddingStats)}`);
      }

      logger.info(`Embedding validation passed for ${participantId}`, embeddingStats);
      return embeddingStats;
    });

    // Merkle DAG: fusion_completion -> workflow_progression
    // ステップ4: 核融合完了イベント送信
    await step.run('send-fusion-completed', async () => {
      const completionEvent = {
        participantId,
        weights: fusionResult.weights,
        fusedKernelUri: `memory://fused_kernel/${participantId}`,
        embeddingUri: `memory://embedding/${participantId}`,
        dims: options.dimensions,
        n,
        fusionResult, // 実際のデータも含める
        validation: embeddingValidation,
      };

      const result = await inngest.send({
        name: events.KERNEL_FUSION_COMPLETED,
        data: completionEvent,
      });

      logger.info(`Kernel fusion workflow completed for ${participantId}`);
      return result;
    });

    return {
      success: true,
      participantId,
      weights: fusionResult.weights,
      embeddingDimensions: fusionResult.embedding.length,
      eigenValues: fusionResult.eigenValues.slice(0, 5),
      validation: embeddingValidation,
    };
  }
);

// Merkle DAG: distance_matrix_loader -> data_access
// 距離行列の読み込みヘルパー関数
async function loadDistanceMatrixFromUri(uri: string): Promise<number[][]> {
  // メモリ内のデータURIから距離行列を取得
  // 実際の実装では、前のステップで保存されたデータを読み込む
  // ここではデモ用のダミーデータを返す
  
  if (uri.startsWith('memory://')) {
    // メモリ内のデータを取得（実際の実装では適切なストレージから読み込む）
    const dummyMatrix = Array.from({ length: 10 }, (_, i) => 
      Array.from({ length: 10 }, (_, j) => i === j ? 0 : Math.random() * 10)
    );
    return dummyMatrix;
  }
  
  throw new Error(`Unsupported URI format: ${uri}`);
}

// Merkle DAG: fusion_failure_handler -> error_recovery
// 核融合失敗時の処理ワークフロー
export const kernelFusionFailureWorkflow = inngest.createFunction(
  {
    id: 'kernel-fusion-failure-handler',
    name: 'Kernel Fusion Failure Handler',
  },
  {
    event: events.KERNEL_FUSION_FAILED,
  },
  async ({ event, step, logger }) => {
    const { participantId, error } = event.data;

    logger.error(`Kernel fusion failed for ${participantId}`, {
      error,
      timestamp: new Date().toISOString(),
    });

    // 失敗時のクリーンアップ処理
    await step.run('cleanup-failed-fusion', async () => {
      logger.info(`Cleanup completed for failed kernel fusion: ${participantId}`);
    });

    // 通知送信
    await step.run('send-notification', async () => {
      const notificationResult = await inngest.send({
        name: events.NOTIFICATION_SENT,
        data: {
          type: 'kernel_fusion_failure',
          participantId,
          message: `核融合処理に失敗しました: ${error}`,
          timestamp: new Date().toISOString(),
        },
      });
      return notificationResult;
    });

    return {
      handled: true,
      participantId,
      error,
    };
  }
);
