// LLM-BOUNDARY: 50_adapters - RouteHandler/ServerActions/外部API実装

import type { EventBusPort, DomainEvent } from '@/lib/participant/ports/event-bus';
import type { EventType } from '@/lib/participant/events/events';
import { Inngest } from 'inngest';

// Inngestクライアントの初期化（ローカル開発用）
const inngestOptions: { id: string; baseUrl?: string } = {
  id: 'spirit-in-physics',
};
if (process.env.NODE_ENV === 'development') {
  inngestOptions.baseUrl = 'http://localhost:25250';
}
export const inngest = new Inngest(inngestOptions);

// イベントタイプの定義
export const events = {
  // 動画分析イベント
  VIDEO_ANALYSIS_REQUESTED: 'video.analysis.requested',
  VIDEO_ANALYSIS_STARTED: 'video.analysis.started',
  VIDEO_ANALYSIS_COMPLETED: 'video.analysis.completed',
  VIDEO_ANALYSIS_FAILED: 'video.analysis.failed',

  // バッチ分析イベント
  BATCH_ANALYSIS_REQUESTED: 'batch.analysis.requested',
  BATCH_ANALYSIS_STARTED: 'batch.analysis.started',
  BATCH_ANALYSIS_COMPLETED: 'batch.analysis.completed',
  BATCH_ANALYSIS_FAILED: 'batch.analysis.failed',

  // 結果処理イベント
  RESULTS_PROCESSING_STARTED: 'results.processing.started',
  RESULTS_PROCESSING_COMPLETED: 'results.processing.completed',
  RESULTS_PROCESSING_FAILED: 'results.processing.failed',

  // 通知イベント
  NOTIFICATION_SENT: 'notification.sent',
} as const;

// イベントデータの型定義
export interface VideoAnalysisEvent {
  participantId: string;
  videoFile: string;
  sessionType: string;
  priority?: 'low' | 'normal' | 'high';
  retryCount?: number;
}

export interface BatchAnalysisEvent {
  participantIds: string[];
  priority?: 'low' | 'normal' | 'high';
  batchId: string;
}

export interface AnalysisResultEvent {
  participantId: string;
  videoFile: string;
  results: any;
  processingTime: number;
  metadata: Record<string, any>;
}

// ワークフロー関数の型定義
export type VideoAnalysisWorkflow = (event: VideoAnalysisEvent) => Promise<void>;
export type BatchAnalysisWorkflow = (event: BatchAnalysisEvent) => Promise<void>;

export class EventBusAdapter implements EventBusPort {
  private subscribers: Map<EventType, Array<(event: DomainEvent) => void>> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    console.log('Publishing event:', event);

    // Inngestイベントも送信
    try {
      await inngest.send({
        name: event.type,
        data: event.payload,
        user: { id: 'system' }
      });
    } catch (error) {
      console.warn('Failed to send Inngest event:', error);
    }

    const handlers = this.subscribers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });
  }

  subscribe(eventType: EventType, handler: (event: DomainEvent) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType)!.push(handler);

    // 購読解除関数を返す
    return () => {
      const handlers = this.subscribers.get(eventType) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }
}

export const eventBusAdapter = new EventBusAdapter();
