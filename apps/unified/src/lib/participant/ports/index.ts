// LLM-BOUNDARY: 20_ports - 抽象Port（ドメインが依存するだけ）

// 再エクスポート順: 00→80 の順で固定

export {
  type StoragePort,
} from './storage';
export {
  type EmotionAnalysisPort,
} from './emotion-analysis';
export {
  type MediaPort,
} from './media';
export {
  type DomainEvent,
  type EventBusPort,
} from './event-bus';
export {
  type HumeApiPort,
  type ExternalApiPort,
} from './external-api';
