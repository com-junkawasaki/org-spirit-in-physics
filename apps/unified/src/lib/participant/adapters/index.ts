// LLM-BOUNDARY: 50_adapters - RouteHandler/ServerActions/外部API実装

// 再エクスポート順: 00→80 の順で固定

export {
  StorageAdapter,
  storageAdapter,
} from './storage-adapter';
export {
  EmotionAnalysisAdapter,
  emotionAnalysisAdapter,
} from './emotion-analysis-adapter';
export {
  MediaAdapter,
  mediaAdapter,
} from './media-adapter';
export {
  EventBusAdapter,
  eventBusAdapter,
  inngest,
  events,
  type VideoAnalysisEvent,
  type BatchAnalysisEvent,
  type AnalysisResultEvent,
  type VideoAnalysisWorkflow,
  type BatchAnalysisWorkflow,
} from './event-bus-adapter';
export {
  ExternalApiAdapter,
  externalApiAdapter,
} from './external-api-adapter';
