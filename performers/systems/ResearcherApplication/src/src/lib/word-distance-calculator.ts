// Merkle DAG: lib.word_distance_calculator
// 被験者・セッションごとの単語間距離計算
// Word2Vec、統合ベクトル、感情ベクトルそれぞれの距離を計算

/**
 * 単語のベクトル表現
 */
export interface WordVector {
  word: string;
  word2vecComponent?: number;
  emotionComponent?: number;
  reactionTimeComponent?: number;
  skinPotentialComponent?: number;
  spiritProbability?: number;
}

/**
 * 単語間距離計算の入力
 */
export interface WordDistanceInput {
  participantId: string;
  sessionId?: string;
  words: WordVector[];
}

/**
 * 距離計算結果
 */
export interface WordDistancePair {
  word1: string;
  word2: string;
  word2vecDistance: number;
  integratedDistance: number;
  emotionalDistance: number;
  cosineSimilarity?: number;
  euclideanDistance?: number;
}

/**
 * 単語間距離計算の結果
 */
export interface WordDistanceResult {
  participantId: string;
  sessionId?: string;
  distances: WordDistancePair[];
  statistics: {
    averageWord2VecDistance: number;
    averageIntegratedDistance: number;
    averageEmotionalDistance: number;
    minDistance: number;
    maxDistance: number;
  };
}

/**
 * コサイン距離を計算
 * 
 * @param vec1 ベクトル1
 * @param vec2 ベクトル2
 * @returns コサイン距離 (0-2, 0が最も近い)
 */
export function calculateCosineDistance(
  vec1: number[],
  vec2: number[]
): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i]! * vec2[i]!;
    norm1 += vec1[i]! * vec1[i]!;
    norm2 += vec2[i]! * vec2[i]!;
  }

  const norm1Sqrt = Math.sqrt(norm1);
  const norm2Sqrt = Math.sqrt(norm2);

  if (norm1Sqrt === 0 || norm2Sqrt === 0) {
    return 1.0; // ゼロベクトルの場合は距離1
  }

  const cosineSimilarity = dotProduct / (norm1Sqrt * norm2Sqrt);
  // コサイン距離 = 1 - コサイン類似度
  return 1.0 - cosineSimilarity;
}

/**
 * ユークリッド距離を計算
 * 
 * @param vec1 ベクトル1
 * @param vec2 ベクトル2
 * @returns ユークリッド距離
 */
export function calculateEuclideanDistance(
  vec1: number[],
  vec2: number[]
): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let sumSqDiff = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i]! - vec2[i]!;
    sumSqDiff += diff * diff;
  }

  return Math.sqrt(sumSqDiff);
}

/**
 * Word2Vec成分のみの距離を計算
 * 
 * @param word1 単語1
 * @param word2 単語2
 * @returns Word2Vec距離
 */
function calculateWord2VecDistance(
  word1: WordVector,
  word2: WordVector
): number {
  const vec1 = word1.word2vecComponent ?? 0;
  const vec2 = word2.word2vecComponent ?? 0;
  
  // Word2Vec成分は単一値なので、単純な差分の絶対値
  return Math.abs(vec1 - vec2);
}

/**
 * 統合ベクトル距離を計算
 * Word2Vec, ReactionTime, Emotion, SkinPotential を統合
 * 
 * @param word1 単語1
 * @param word2 単語2
 * @returns 統合距離
 */
function calculateIntegratedDistance(
  word1: WordVector,
  word2: WordVector
): number {
  const vec1: number[] = [
    word1.word2vecComponent ?? 0,
    word1.reactionTimeComponent ?? 0,
    word1.emotionComponent ?? 0,
  ];

  if (word1.skinPotentialComponent !== undefined) {
    vec1.push(word1.skinPotentialComponent);
  }

  const vec2: number[] = [
    word2.word2vecComponent ?? 0,
    word2.reactionTimeComponent ?? 0,
    word2.emotionComponent ?? 0,
  ];

  if (word2.skinPotentialComponent !== undefined) {
    vec2.push(word2.skinPotentialComponent);
  }

  // 次元を揃える
  const maxLength = Math.max(vec1.length, vec2.length);
  while (vec1.length < maxLength) {
    vec1.push(0);
  }
  while (vec2.length < maxLength) {
    vec2.push(0);
  }

  return calculateEuclideanDistance(vec1, vec2);
}

/**
 * 感情ベクトル距離を計算
 * Emotion成分のみを使用
 * 
 * @param word1 単語1
 * @param word2 単語2
 * @returns 感情距離
 */
function calculateEmotionalDistance(
  word1: WordVector,
  word2: WordVector
): number {
  const vec1 = word1.emotionComponent ?? 0;
  const vec2 = word2.emotionComponent ?? 0;
  
  // 感情成分の差分
  return Math.abs(vec1 - vec2);
}

/**
 * 全単語ペアの距離を計算
 * 
 * @param input 距離計算の入力
 * @returns 距離計算結果
 */
export function calculateWordDistances(
  input: WordDistanceInput
): WordDistanceResult {
  const { participantId, sessionId, words } = input;

  if (words.length < 2) {
    return {
      participantId,
      sessionId,
      distances: [],
      statistics: {
        averageWord2VecDistance: 0,
        averageIntegratedDistance: 0,
        averageEmotionalDistance: 0,
        minDistance: 0,
        maxDistance: 0,
      },
    };
  }

  const distances: WordDistancePair[] = [];
  const allDistances: number[] = [];

  // 全単語ペアを計算
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const word1 = words[i]!;
      const word2 = words[j]!;

      const word2vecDist = calculateWord2VecDistance(word1, word2);
      const integratedDist = calculateIntegratedDistance(word1, word2);
      const emotionalDist = calculateEmotionalDistance(word1, word2);

      // コサイン類似度も計算（統合ベクトルに対して）
      const integratedVec1: number[] = [
        word1.word2vecComponent ?? 0,
        word1.reactionTimeComponent ?? 0,
        word1.emotionComponent ?? 0,
      ];
      const integratedVec2: number[] = [
        word2.word2vecComponent ?? 0,
        word2.reactionTimeComponent ?? 0,
        word2.emotionComponent ?? 0,
      ];

      const cosineDist = calculateCosineDistance(integratedVec1, integratedVec2);
      const euclideanDist = calculateEuclideanDistance(
        integratedVec1,
        integratedVec2
      );

      distances.push({
        word1: word1.word,
        word2: word2.word,
        word2vecDistance: word2vecDist,
        integratedDistance: integratedDist,
        emotionalDistance: emotionalDist,
        cosineSimilarity: 1.0 - cosineDist,
        euclideanDistance: euclideanDist,
      });

      allDistances.push(integratedDist);
    }
  }

  // 統計情報を計算
  const avgWord2VecDist =
    distances.reduce((sum, d) => sum + d.word2vecDistance, 0) /
    distances.length;
  const avgIntegratedDist =
    distances.reduce((sum, d) => sum + d.integratedDistance, 0) /
    distances.length;
  const avgEmotionalDist =
    distances.reduce((sum, d) => sum + d.emotionalDistance, 0) /
    distances.length;
  const minDist = Math.min(...allDistances);
  const maxDist = Math.max(...allDistances);

  return {
    participantId,
    sessionId,
    distances,
    statistics: {
      averageWord2VecDistance: avgWord2VecDist,
      averageIntegratedDistance: avgIntegratedDist,
      averageEmotionalDistance: avgEmotionalDist,
      minDistance: minDist,
      maxDistance: maxDist,
    },
  };
}

/**
 * 距離が近い単語ペアを抽出
 * 
 * @param result 距離計算結果
 * @param threshold 閾値（この値以下の距離のペアを抽出）
 * @param distanceType 使用する距離タイプ
 * @returns 距離が近い単語ペアのリスト
 */
export function findCloseWordPairs(
  result: WordDistanceResult,
  threshold: number,
  distanceType: 'word2vec' | 'integrated' | 'emotional' = 'integrated'
): WordDistancePair[] {
  return result.distances.filter((d) => {
    const distance =
      distanceType === 'word2vec'
        ? d.word2vecDistance
        : distanceType === 'emotional'
        ? d.emotionalDistance
        : d.integratedDistance;
    return distance <= threshold;
  });
}

/**
 * セッションごとに距離を計算
 * 
 * @param input セッションごとの単語データ
 * @returns セッションごとの距離計算結果
 */
export function calculateWordDistancesBySession(
  input: Array<{
    sessionId: string;
    words: WordVector[];
  }>
): Record<string, WordDistanceResult> {
  const results: Record<string, WordDistanceResult> = {};

  for (const session of input) {
    results[session.sessionId] = calculateWordDistances({
      participantId: '', // セッションのみの場合は空
      sessionId: session.sessionId,
      words: session.words,
    });
  }

  return results;
}

