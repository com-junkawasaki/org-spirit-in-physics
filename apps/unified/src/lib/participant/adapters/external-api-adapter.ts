// LLM-BOUNDARY: 50_adapters - RouteHandler/ServerActions/外部API実装

import type { ExternalApiPort, HumeApiPort } from '@/lib/participant/ports/external-api';
import type { HumeEmotionResponse } from '@/lib/participant/schema';
import { HumeClient } from 'hume';

class HumeApiAdapter implements HumeApiPort {
  private hume: HumeClient | null = null;

  constructor() {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_API_SECRET || process.env.HUME_API;
    
    if (apiKey && secretKey) {
      try {
        this.hume = new HumeClient({
          apiKey,
          secretKey
        });
      } catch (error) {
        console.error('Failed to initialize Hume client:', error);
      }
    } else {
      console.warn('Hume API credentials not configured. Set HUME_API_KEY and HUME_API_SECRET environment variables.');
    }
  }

  async analyzeEmotions(videoBuffer: Buffer): Promise<HumeEmotionResponse> {
    if (!this.hume) {
      throw new Error('Hume API client not initialized. Please configure HUME_API_KEY and HUME_API_SECRET environment variables.');
    }

    try {
      // 実際のHume API呼び出し
      // 注意: 実際のAPIエンドポイントとメソッドはHume SDKのドキュメントに従って実装してください
      const response = await (this.hume.expressionMeasurement as any).analyzeVideo({
        data: videoBuffer
      });

      // Hume APIのレスポンスをHumeEmotionResponse形式に変換
      // 注意: 実際のレスポンス構造に合わせて調整してください
      if (response && response.predictions && Array.isArray(response.predictions)) {
        return {
          predictions: response.predictions.map((pred: any) => ({
            emotions: pred.emotions || [],
            confidence: pred.confidence || 0
          }))
        };
      }

      // レスポンスが期待される形式でない場合
      return {
        predictions: []
      };
    } catch (error) {
      console.error('Error calling Hume API:', error);
      throw new Error(`Failed to analyze emotions with Hume API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export class ExternalApiAdapter implements ExternalApiPort {
  hume: HumeApiAdapter;

  constructor() {
    this.hume = new HumeApiAdapter();
  }
}

export const externalApiAdapter = new ExternalApiAdapter();
