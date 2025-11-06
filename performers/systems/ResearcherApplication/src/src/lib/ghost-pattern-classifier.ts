// Merkle DAG: lib.ghost_pattern_classifier
// gene/meme/archetype分類ロジック
// ユングの単語連想法とHume分析データから複合体パターンを検出

// Ghost Pattern定義データのインポート
// JSON-LDファイルをJSONとして読み込み
let ghostPatternsData: {
  archetypes: Array<{
    id: string;
    name: string;
    description?: string;
    keywords: string[];
  }>;
  geneticPatterns: Array<{
    id: string;
    name: string;
    description?: string;
    keywords: string[];
  }>;
  memeticPatterns: Array<{
    id: string;
    name: string;
    description?: string;
    keywords: string[];
  }>;
};

// 実行時に読み込む（動的インポートまたは直接定義）
// 開発環境では直接読み込み可能
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ghostPatternsData = require('../../resources/ghost-patterns.json');
} catch {
  // フォールバック: デフォルト定義
  ghostPatternsData = {
    archetypes: [
      { id: 'mother', name: 'Mother', keywords: ['母親', '母', '保護'] },
      { id: 'shadow', name: 'Shadow', keywords: ['影', '闇', '否定的'] },
    ],
    geneticPatterns: [],
    memeticPatterns: [],
  };
}

/**
 * Ghost Pattern定義の型
 */
interface GhostPatternDefinition {
  id: string;
  name: string;
  description?: string;
  keywords: string[];
}

/**
 * 単語応答データ
 */
export interface WordResponseData {
  stimulusWord: string;
  responseWord: string;
  reactionTimeMs?: number;
  emotionComponent?: number;
  spiritProbability?: number;
}

/**
 * Ghost Pattern分類結果
 */
export interface GhostPatternClassification {
  patternType: 'gene' | 'meme' | 'archetype';
  patternName: string;
  patternId: string;
  confidence: number; // 0-1
  matchedWords: string[];
  wordDistances: Array<{ word1: string; word2: string; distance: number }>;
  evidence: Array<{
    word: string;
    keywordMatch: string;
    score: number;
  }>;
}

/**
 * 分類オプション
 */
export interface ClassificationOptions {
  /**
   * 最小信頼度閾値 (デフォルト: 0.3)
   */
  minConfidence?: number;
  /**
   * キーワードマッチの重み (デフォルト: 0.6)
   */
  keywordWeight?: number;
  /**
   * 感情反応の重み (デフォルト: 0.2)
   */
  emotionWeight?: number;
  /**
   * 反応時間の重み (デフォルト: 0.1)
   */
  reactionTimeWeight?: number;
  /**
   * Spirit確率の重み (デフォルト: 0.1)
   */
  spiritProbabilityWeight?: number;
}

/**
 * 単語がキーワードリストにマッチするかをチェック
 */
function matchKeywords(word: string, keywords: string[]): {
  matched: boolean;
  matchedKeyword?: string;
  score: number;
} {
  const normalizedWord = word.toLowerCase().trim();
  
  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    
    // 完全一致
    if (normalizedWord === normalizedKeyword) {
      return { matched: true, matchedKeyword: keyword, score: 1.0 };
    }
    
    // 部分一致（キーワードが単語に含まれる、または単語がキーワードに含まれる）
    if (
      normalizedWord.includes(normalizedKeyword) ||
      normalizedKeyword.includes(normalizedWord)
    ) {
      const lengthRatio = Math.min(
        normalizedWord.length,
        normalizedKeyword.length
      ) / Math.max(normalizedWord.length, normalizedKeyword.length);
      return {
        matched: true,
        matchedKeyword: keyword,
        score: 0.7 * lengthRatio,
      };
    }
  }
  
  return { matched: false, score: 0.0 };
}

/**
 * ユングの元型（Archetype）パターンを検出
 * 
 * @param responses 単語応答データ配列
 * @param options 分類オプション
 * @returns 検出されたArchetypeパターンのリスト
 */
export function detectArchetype(
  responses: WordResponseData[],
  options: ClassificationOptions = {}
): GhostPatternClassification[] {
  const {
    minConfidence = 0.3,
    keywordWeight = 0.6,
    emotionWeight = 0.2,
    reactionTimeWeight = 0.1,
    spiritProbabilityWeight = 0.1,
  } = options;

  const patterns: GhostPatternClassification[] = [];
  const archetypes = ghostPatternsData.archetypes as GhostPatternDefinition[];

  for (const archetype of archetypes) {
    const evidence: Array<{
      word: string;
      keywordMatch: string;
      score: number;
    }> = [];
    const matchedWords: string[] = [];
    let totalScore = 0;
    let matchCount = 0;

    // 各応答をチェック
    for (const response of responses) {
      // 刺激語と応答語の両方をチェック
      const stimulusMatch = matchKeywords(
        response.stimulusWord,
        archetype.keywords
      );
      const responseMatch = matchKeywords(
        response.responseWord,
        archetype.keywords
      );

      if (stimulusMatch.matched || responseMatch.matched) {
        const match = stimulusMatch.matched ? stimulusMatch : responseMatch;
        const word = stimulusMatch.matched
          ? response.stimulusWord
          : response.responseWord;

        if (!matchedWords.includes(word)) {
          matchedWords.push(word);
        }

        // キーワードマッチスコア
        const keywordScore = match.score;

        // 感情反応スコア (emotionComponentが高いほど強く反応)
        const emotionScore =
          response.emotionComponent !== undefined
            ? Math.min(response.emotionComponent, 1.0)
            : 0.5;

        // 反応時間スコア (短いほど強く反応)
        const reactionTimeScore =
          response.reactionTimeMs !== undefined
            ? Math.max(0, 1.0 - response.reactionTimeMs / 3000) // 3秒を最大として正規化
            : 0.5;

        // Spirit確率スコア
        const spiritScore =
          response.spiritProbability !== undefined
            ? response.spiritProbability
            : 0.5;

        // 統合スコア計算
        const integratedScore =
          keywordScore * keywordWeight +
          emotionScore * emotionWeight +
          reactionTimeScore * reactionTimeWeight +
          spiritScore * spiritProbabilityWeight;

        evidence.push({
          word,
          keywordMatch: match.matchedKeyword || '',
          score: integratedScore,
        });

        totalScore += integratedScore;
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(totalScore / matchCount, 1.0);

      if (confidence >= minConfidence) {
        // 単語間距離を計算（マッチした単語ペアのみ）
        const wordDistances: Array<{
          word1: string;
          word2: string;
          distance: number;
        }> = [];

        for (let i = 0; i < matchedWords.length; i++) {
          for (let j = i + 1; j < matchedWords.length; j++) {
            // 簡易的な距離: 同じパターンに属する単語は距離が近いと仮定
            const distance = 1.0 - confidence;
            wordDistances.push({
              word1: matchedWords[i]!,
              word2: matchedWords[j]!,
              distance,
            });
          }
        }

        patterns.push({
          patternType: 'archetype',
          patternName: archetype.name,
          patternId: archetype.id,
          confidence,
          matchedWords,
          wordDistances,
          evidence,
        });
      }
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 遺伝的パターン（Gene）を検出
 * 
 * @param responses 単語応答データ配列
 * @param options 分類オプション
 * @returns 検出されたGeneパターンのリスト
 */
export function detectGeneticPattern(
  responses: WordResponseData[],
  options: ClassificationOptions = {}
): GhostPatternClassification[] {
  const {
    minConfidence = 0.3,
    keywordWeight = 0.7,
    emotionWeight = 0.15,
    reactionTimeWeight = 0.1,
    spiritProbabilityWeight = 0.05,
  } = options;

  const patterns: GhostPatternClassification[] = [];
  const geneticPatterns =
    ghostPatternsData.geneticPatterns as GhostPatternDefinition[];

  for (const pattern of geneticPatterns) {
    const evidence: Array<{
      word: string;
      keywordMatch: string;
      score: number;
    }> = [];
    const matchedWords: string[] = [];
    let totalScore = 0;
    let matchCount = 0;

    for (const response of responses) {
      const stimulusMatch = matchKeywords(
        response.stimulusWord,
        pattern.keywords
      );
      const responseMatch = matchKeywords(
        response.responseWord,
        pattern.keywords
      );

      if (stimulusMatch.matched || responseMatch.matched) {
        const match = stimulusMatch.matched ? stimulusMatch : responseMatch;
        const word = stimulusMatch.matched
          ? response.stimulusWord
          : response.responseWord;

        if (!matchedWords.includes(word)) {
          matchedWords.push(word);
        }

        const keywordScore = match.score;
        const emotionScore =
          response.emotionComponent !== undefined
            ? Math.min(response.emotionComponent, 1.0)
            : 0.5;
        const reactionTimeScore =
          response.reactionTimeMs !== undefined
            ? Math.max(0, 1.0 - response.reactionTimeMs / 3000)
            : 0.5;
        const spiritScore =
          response.spiritProbability !== undefined
            ? response.spiritProbability
            : 0.5;

        const integratedScore =
          keywordScore * keywordWeight +
          emotionScore * emotionWeight +
          reactionTimeScore * reactionTimeWeight +
          spiritScore * spiritProbabilityWeight;

        evidence.push({
          word,
          keywordMatch: match.matchedKeyword || '',
          score: integratedScore,
        });

        totalScore += integratedScore;
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(totalScore / matchCount, 1.0);

      if (confidence >= minConfidence) {
        const wordDistances: Array<{
          word1: string;
          word2: string;
          distance: number;
        }> = [];

        for (let i = 0; i < matchedWords.length; i++) {
          for (let j = i + 1; j < matchedWords.length; j++) {
            const distance = 1.0 - confidence;
            wordDistances.push({
              word1: matchedWords[i]!,
              word2: matchedWords[j]!,
              distance,
            });
          }
        }

        patterns.push({
          patternType: 'gene',
          patternName: pattern.name,
          patternId: pattern.id,
          confidence,
          matchedWords,
          wordDistances,
          evidence,
        });
      }
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 文化的パターン（Meme）を検出
 * 
 * @param responses 単語応答データ配列
 * @param options 分類オプション
 * @returns 検出されたMemeパターンのリスト
 */
export function detectMemeticPattern(
  responses: WordResponseData[],
  options: ClassificationOptions = {}
): GhostPatternClassification[] {
  const {
    minConfidence = 0.3,
    keywordWeight = 0.7,
    emotionWeight = 0.2,
    reactionTimeWeight = 0.05,
    spiritProbabilityWeight = 0.05,
  } = options;

  const patterns: GhostPatternClassification[] = [];
  const memeticPatterns =
    ghostPatternsData.memeticPatterns as GhostPatternDefinition[];

  for (const pattern of memeticPatterns) {
    const evidence: Array<{
      word: string;
      keywordMatch: string;
      score: number;
    }> = [];
    const matchedWords: string[] = [];
    let totalScore = 0;
    let matchCount = 0;

    for (const response of responses) {
      const stimulusMatch = matchKeywords(
        response.stimulusWord,
        pattern.keywords
      );
      const responseMatch = matchKeywords(
        response.responseWord,
        pattern.keywords
      );

      if (stimulusMatch.matched || responseMatch.matched) {
        const match = stimulusMatch.matched ? stimulusMatch : responseMatch;
        const word = stimulusMatch.matched
          ? response.stimulusWord
          : response.responseWord;

        if (!matchedWords.includes(word)) {
          matchedWords.push(word);
        }

        const keywordScore = match.score;
        const emotionScore =
          response.emotionComponent !== undefined
            ? Math.min(response.emotionComponent, 1.0)
            : 0.5;
        const reactionTimeScore =
          response.reactionTimeMs !== undefined
            ? Math.max(0, 1.0 - response.reactionTimeMs / 3000)
            : 0.5;
        const spiritScore =
          response.spiritProbability !== undefined
            ? response.spiritProbability
            : 0.5;

        const integratedScore =
          keywordScore * keywordWeight +
          emotionScore * emotionWeight +
          reactionTimeScore * reactionTimeWeight +
          spiritScore * spiritProbabilityWeight;

        evidence.push({
          word,
          keywordMatch: match.matchedKeyword || '',
          score: integratedScore,
        });

        totalScore += integratedScore;
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(totalScore / matchCount, 1.0);

      if (confidence >= minConfidence) {
        const wordDistances: Array<{
          word1: string;
          word2: string;
          distance: number;
        }> = [];

        for (let i = 0; i < matchedWords.length; i++) {
          for (let j = i + 1; j < matchedWords.length; j++) {
            const distance = 1.0 - confidence;
            wordDistances.push({
              word1: matchedWords[i]!,
              word2: matchedWords[j]!,
              distance,
            });
          }
        }

        patterns.push({
          patternType: 'meme',
          patternName: pattern.name,
          patternId: pattern.id,
          confidence,
          matchedWords,
          wordDistances,
          evidence,
        });
      }
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 全てのGhost Patternを分類
 * 
 * @param responses 単語応答データ配列
 * @param options 分類オプション
 * @returns 全ての検出されたGhost Patternのリスト
 */
export function classifyGhostPatterns(
  responses: WordResponseData[],
  options: ClassificationOptions = {}
): GhostPatternClassification[] {
  const archetypes = detectArchetype(responses, options);
  const genes = detectGeneticPattern(responses, options);
  const memes = detectMemeticPattern(responses, options);

  return [...archetypes, ...genes, ...memes].sort(
    (a, b) => b.confidence - a.confidence
  );
}

