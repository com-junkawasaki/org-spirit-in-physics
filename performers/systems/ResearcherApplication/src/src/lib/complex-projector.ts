// Merkle DAG: lib.complex_projector
// ユングのcomplex概念をspirit確率として投影
// complex = spirit という前提に基づく

/**
 * Complex Projection 入力データ
 */
export interface ComplexProjectionInput {
  word2vecComponent: number;
  reactionTimeComponent: number;
  emotionComponent: number;
  skinPotentialComponent?: number;
  spiritProbability: number; // complex = spirit
}

/**
 * Complex Projection 結果
 */
export interface ComplexProjectionResult {
  complexValue: number; // = spirit_probability
  projectionVector: number[]; // ベクトル空間への投影 (3D or 4D)
  intensity: number; // 複合体の強度 (0-1)
  normalizedProjection: number[]; // 正規化された投影ベクトル
}

/**
 * Complex Intensity 計算オプション
 */
export interface ComplexIntensityOptions {
  /**
   * 反応時間の重み (デフォルト: 0.3)
   */
  reactionTimeWeight?: number;
  /**
   * 感情反応の重み (デフォルト: 0.4)
   */
  emotionWeight?: number;
  /**
   * Word2Vec成分の重み (デフォルト: 0.2)
   */
  word2vecWeight?: number;
  /**
   * 皮膚電位成分の重み (デフォルト: 0.1, 利用可能な場合)
   */
  skinPotentialWeight?: number;
}

/**
 * spirit_probabilityをベクトル空間に投影する
 * complex = spirit として扱い、各成分から統合的な投影ベクトルを生成
 * 
 * @param input Complex投影の入力データ
 * @returns Complex投影結果
 */
export function projectComplexToVector(
  input: ComplexProjectionInput
): ComplexProjectionResult {
  const {
    word2vecComponent,
    reactionTimeComponent,
    emotionComponent,
    skinPotentialComponent,
    spiritProbability,
  } = input;

  // complex_value = spirit_probability
  const complexValue = spiritProbability;

  // ベクトル空間への投影: [word2vec, reactionTime, emotion, skinPotential(optional)]
  const projectionVector: number[] = [
    word2vecComponent || 0,
    reactionTimeComponent || 0,
    emotionComponent || 0,
  ];

  // 皮膚電位成分がある場合は追加
  if (skinPotentialComponent !== undefined) {
    projectionVector.push(skinPotentialComponent);
  }

  // L2正規化（ベクトルの長さを1に）
  const norm = Math.sqrt(
    projectionVector.reduce((sum, val) => sum + val * val, 0)
  );
  const normalizedProjection = norm > 0
    ? projectionVector.map(val => val / norm)
    : projectionVector.map(() => 0);

  // 複合体強度を計算
  const intensity = calculateComplexIntensity(input);

  return {
    complexValue,
    projectionVector,
    normalizedProjection,
    intensity,
  };
}

/**
 * 反応時間・感情反応から複合体強度を計算
 * 
 * @param input Complex投影の入力データ
 * @param options 強度計算のオプション
 * @returns 複合体強度 (0-1)
 */
export function calculateComplexIntensity(
  input: ComplexProjectionInput,
  options: ComplexIntensityOptions = {}
): number {
  const {
    reactionTimeWeight = 0.3,
    emotionWeight = 0.4,
    word2vecWeight = 0.2,
    skinPotentialWeight = 0.1,
  } = options;

  const {
    word2vecComponent = 0,
    reactionTimeComponent = 0,
    emotionComponent = 0,
    skinPotentialComponent = 0,
    spiritProbability,
  } = input;

  // 各成分を0-1に正規化して統合
  // 反応時間成分: 高い値 = 強い反応 = 複合体が活性化
  const normalizedReactionTime = Math.min(reactionTimeComponent, 1.0);

  // 感情成分: 高い値 = 強い感情反応
  const normalizedEmotion = Math.min(emotionComponent, 1.0);

  // Word2Vec成分: 意味的関連性
  const normalizedWord2Vec = Math.max(0, Math.min(word2vecComponent, 1.0));

  // 皮膚電位成分（利用可能な場合）
  const normalizedSkinPotential = Math.min(
    skinPotentialComponent || 0,
    1.0
  );

  // 重み付き統合
  const hasSkinPotential = skinPotentialComponent !== undefined;
  const totalWeight = hasSkinPotential
    ? reactionTimeWeight + emotionWeight + word2vecWeight + skinPotentialWeight
    : reactionTimeWeight + emotionWeight + word2vecWeight;

  const weightedIntensity =
    (normalizedReactionTime * reactionTimeWeight +
      normalizedEmotion * emotionWeight +
      normalizedWord2Vec * word2vecWeight +
      (hasSkinPotential ? normalizedSkinPotential * skinPotentialWeight : 0)) /
    totalWeight;

  // spirit_probabilityも考慮（complex = spirit）
  const finalIntensity = (weightedIntensity + spiritProbability) / 2;

  // 0-1の範囲にクリップ
  return Math.max(0, Math.min(1, finalIntensity));
}

/**
 * 複数のComplex投影結果を集約
 * 
 * @param projections 複数のComplex投影結果
 * @returns 集約されたComplex投影結果
 */
export function aggregateComplexProjections(
  projections: ComplexProjectionResult[]
): ComplexProjectionResult {
  if (projections.length === 0) {
    return {
      complexValue: 0,
      projectionVector: [0, 0, 0],
      normalizedProjection: [0, 0, 0],
      intensity: 0,
    };
  }

  // 平均値を計算
  const avgComplexValue =
    projections.reduce((sum, p) => sum + p.complexValue, 0) /
    projections.length;

  const avgIntensity =
    projections.reduce((sum, p) => sum + p.intensity, 0) / projections.length;

  // 投影ベクトルの平均（次元が同じであることを前提）
  const vectorLength = projections[0]?.projectionVector.length || 3;
  const avgProjectionVector = Array.from({ length: vectorLength }, (_, i) => {
    const sum = projections.reduce(
      (s, p) => s + (p.projectionVector[i] || 0),
      0
    );
    return sum / projections.length;
  });

  // 正規化
  const norm = Math.sqrt(
    avgProjectionVector.reduce((sum, val) => sum + val * val, 0)
  );
  const normalizedProjection =
    norm > 0 ? avgProjectionVector.map(val => val / norm) : avgProjectionVector.map(() => 0);

  return {
    complexValue: avgComplexValue,
    projectionVector: avgProjectionVector,
    normalizedProjection,
    intensity: avgIntensity,
  };
}

/**
 * Complex投影結果をベクトル空間での距離に変換
 * 
 * @param projection1 最初のComplex投影結果
 * @param projection2 2番目のComplex投影結果
 * @returns ユークリッド距離
 */
export function calculateComplexDistance(
  projection1: ComplexProjectionResult,
  projection2: ComplexProjectionResult
): number {
  const v1 = projection1.normalizedProjection;
  const v2 = projection2.normalizedProjection;

  // 次元を揃える（短い方に合わせる）
  const minLength = Math.min(v1.length, v2.length);
  let sumSqDiff = 0;

  for (let i = 0; i < minLength; i++) {
    const diff = (v1[i] || 0) - (v2[i] || 0);
    sumSqDiff += diff * diff;
  }

  // 次元が異なる場合は残りの差を追加
  const maxLength = Math.max(v1.length, v2.length);
  for (let i = minLength; i < maxLength; i++) {
    const val = (v1[i] ?? v2[i]) || 0;
    sumSqDiff += val * val;
  }

  return Math.sqrt(sumSqDiff);
}

