// Merkle DAG: trpc_routers.types.router_options
// ルーターオプション型定義（researcher依存の抽象化）

/**
 * Merkle DAG: AnalysisFunctions
 * 解析パイプライン関数のインターフェース
 * OWL: spirit:AnalysisPipeline.performs
 */
export interface AnalysisFunctions {
  analyzeParticipantResponses: (participantId: string) => Promise<void>;
  analyzeAllParticipants: () => Promise<void>;
}

/**
 * Merkle DAG: EmotionAnalysisFunctions
 * 感情分析関数のインターフェース
 * OWL: spirit:EmotionAnalysisProcess.performs
 */
export interface EmotionAnalysisFunctions {
  analyzeVideoEmotions: (
    participantId: string,
    videoFile: string,
    sessionType: string
  ) => Promise<any>;
  analyzeAllParticipantVideos: (participantId: string) => Promise<any[]>;
  loadEmotionAnalysisResults: (participantId: string) => Promise<any[]>;
  generateEmotionStatistics: (results: any[]) => any;
}

/**
 * Merkle DAG: RouterOptions
 * ルーター作成時のオプション
 */
export interface RouterOptions {
  analysisFunctions?: AnalysisFunctions;
  emotionAnalysisFunctions?: EmotionAnalysisFunctions;
}

/**
 * Merkle DAG: TRPCProcedure
 * tRPCプロシージャの型定義
 */
export interface TRPCProcedure {
  input: <TInput extends any>(schema: TInput) => {
    query: (fn: (opts: { ctx: any; input: any }) => Promise<any>) => any;
    mutation: (fn: (opts: { ctx: any; input: any }) => Promise<any>) => any;
  };
  query: (fn: (opts: { ctx: any; input?: any }) => Promise<any>) => any;
  mutation: (fn: (opts: { ctx: any; input?: any }) => Promise<any>) => any;
}

