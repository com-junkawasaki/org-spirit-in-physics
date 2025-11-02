// Merkle DAG: analysis.calculate_spirit_probability
// Kawasaki Model に基づく Spirit Probability 計算ロジック

/**
 * Kawasaki Model ハイパーパラメータ
 */
export interface KawasakiModelParams {
  alpha?: number;  // 反応時間の重み（デフォルト: 0.5）
  gamma?: number;  // 生理データの重み（デフォルト: 0.3）
  eta?: number;    // 感情データの重み（デフォルト: 0.2）
  lambda?: number; // 生理データの正規化係数（デフォルト: 1.0）
  eps?: number;    // 反応時間の最小値（デフォルト: 1e-3）
}

/**
 * レスポンスデータ
 */
export interface ResponseData {
  stimulus_word: string;
  response_word: string;
  reaction_time_ms: number;
  emotion?: string;
  emotion_confidence?: number;
  skin_potential?: number;
  word2vec_similarity?: number; // Word2Vec類似度（0-1）
}

/**
 * 分析結果コンポーネント
 */
export interface AnalysisComponents {
  word2vec_component: number;
  reaction_time_component: number;
  skin_potential_component: number;
  emotion_component: number;
}

/**
 * 分析結果
 */
export interface AnalysisResult {
  spirit_probability: number;
  components: AnalysisComponents;
}

/**
 * Word2Vec類似度を計算（簡易実装）
 * TODO: 実際のWord2Vecモデルを使用して実装
 */
export function calculateWord2VecSimilarity(
  stimulusWord: string,
  responseWord: string
): number {
  // 簡易実装: 文字列の類似度を計算
  // 実際の実装では、Word2Vecモデルを使用してコサイン類似度を計算
  if (stimulusWord === responseWord) {
    return 1.0;
  }

  // レーベンシュタイン距離ベースの類似度
  const maxLength = Math.max(stimulusWord.length, responseWord.length);
  if (maxLength === 0) {
    return 0;
  }

  const distance = levenshteinDistance(stimulusWord.toLowerCase(), responseWord.toLowerCase());
  return 1 - (distance / maxLength);
}

/**
 * レーベンシュタイン距離を計算
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * 反応時間コンポーネントを計算
 */
export function calculateReactionTimeComponent(
  reactionTimeMs: number,
  params: KawasakiModelParams = {}
): number {
  const { eps = 1e-3, alpha = 0.5 } = params;
  
  // r(w_I, w_O) = 1/(T(w_I, w_O)+eps)
  const r = 1 / (Math.max(0, reactionTimeMs) + eps);
  
  // 正規化: 0-1の範囲にスケール
  // 反応時間が短いほど高い値（最大1秒で1.0、10秒で約0.1）
  const normalized = Math.min(1.0, 10 / (1 + reactionTimeMs / 1000));
  
  // alphaで重み付け
  return Math.pow(normalized, alpha);
}

/**
 * 生理データコンポーネントを計算
 */
export function calculateSkinPotentialComponent(
  skinPotential: number | undefined,
  previousSkinPotential: number | undefined = 0,
  params: KawasakiModelParams = {}
): number {
  const { gamma = 0.3, lambda = 1.0 } = params;
  
  if (skinPotential === undefined) {
    return 0;
  }

  // ΔSP: 生理データの変化量
  const deltaSP = skinPotential - (previousSkinPotential || 0);
  
  // exp(gamma * (deltaSP / lambda))
  const component = Math.exp(gamma * (deltaSP / lambda));
  
  // 正規化: 0-1の範囲にスケール
  return Math.min(1.0, Math.max(0, component / (1 + Math.abs(deltaSP))));
}

/**
 * 感情コンポーネントを計算
 */
export function calculateEmotionComponent(
  emotion: string | undefined,
  emotionConfidence: number | undefined,
  params: KawasakiModelParams = {}
): number {
  const { eta = 0.2 } = params;
  
  if (!emotion || emotionConfidence === undefined) {
    return 0;
  }

  // 感情スコアを正規化（0-1の範囲）
  const normalizedConfidence = Math.min(1.0, Math.max(0, emotionConfidence));
  
  // exp(eta * f)
  const component = Math.exp(eta * normalizedConfidence);
  
  // 正規化: 0-1の範囲にスケール
  return Math.min(1.0, component / (1 + normalizedConfidence));
}

/**
 * Spirit Probability を計算（Kawasaki Model）
 */
export function calculateSpiritProbability(
  response: ResponseData,
  previousResponse?: ResponseData,
  params: KawasakiModelParams = {}
): AnalysisResult {
  // 各コンポーネントを計算
  const word2vecComponent = response.word2vec_similarity !== undefined
    ? response.word2vec_similarity
    : calculateWord2VecSimilarity(response.stimulus_word, response.response_word);

  const reactionTimeComponent = calculateReactionTimeComponent(
    response.reaction_time_ms,
    params
  );

  const skinPotentialComponent = calculateSkinPotentialComponent(
    response.skin_potential,
    previousResponse?.skin_potential,
    params
  );

  const emotionComponent = calculateEmotionComponent(
    response.emotion,
    response.emotion_confidence,
    params
  );

  // Kawasaki Model: P(w_O | w_I) = w / (1 + w)
  // ここで w = word2vec^alpha * exp(gamma * deltaSP) * exp(eta * f)
  // 簡略化: 各コンポーネントの重み付き和を使用
  const { alpha = 0.5, gamma = 0.3, eta = 0.2 } = params;

  // コンポーネントの重み付き組み合わせ
  const weightedSum = 
    word2vecComponent * 0.4 +
    reactionTimeComponent * 0.3 +
    skinPotentialComponent * 0.15 +
    emotionComponent * 0.15;

  // Spirit Probability: 0-1の範囲に正規化
  // Sigmoid関数を使用して確率に変換
  const spiritProbability = Math.min(0.9999, Math.max(0.0001, weightedSum));

  return {
    spirit_probability: spiritProbability,
    components: {
      word2vec_component: word2vecComponent,
      reaction_time_component: reactionTimeComponent,
      skin_potential_component: skinPotentialComponent,
      emotion_component: emotionComponent,
    },
  };
}

/**
 * 複数のレスポンスに対して一括でSpirit Probabilityを計算
 */
export function calculateSpiritProbabilities(
  responses: ResponseData[],
  params: KawasakiModelParams = {}
): Array<AnalysisResult & { response: ResponseData }> {
  return responses.map((response, index) => {
    const previousResponse = index > 0 ? responses[index - 1] : undefined;
    const result = calculateSpiritProbability(response, previousResponse, params);
    return {
      ...result,
      response,
    };
  });
}

