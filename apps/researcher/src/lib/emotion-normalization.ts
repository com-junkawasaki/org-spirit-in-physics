// Merkle DAG: lib.emotion_normalization
// Hume AIの感情タイプを10種類のEMOTION_KEYSに正規化するユーティリティ
// Pythonのnormalize_emotion_name関数をTypeScriptに移植・拡張

export type EmotionKey = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'calm' | 'focus' | 'excitement' | 'confusion'

export const EMOTION_KEYS: readonly EmotionKey[] = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion'] as const

/**
 * メタデータフィールドのセット（感情データとして扱わない）
 */
const METADATA_FIELDS = new Set([
  'id', 'begintime', 'endtime', 'beginposition', 'endposition', 'confidence', 'speakerconfidence',
  'probability', 'frame', 'time', 'text',
  'facex0', 'facey0', 'facewidth', 'faceheight',
  'au1', 'au2', 'au4', 'au5', 'au6', 'au7', 'au9', 'au10', 'au11', 'au12', 'au14', 'au15', 'au16', 'au17', 'au18', 'au19', 'au20', 'au22', 'au23', 'au24', 'au25', 'au26', 'au27', 'au28', 'au32', 'au34', 'au37', 'au38', 'au43', 'au53', 'au54',
  'hand over mouth', 'hand over eyes', 'hand over forehead', 'hand over face', 'hand touching face / head',
  'beaming', 'biting lip', 'cheering', 'cringe', 'cry', 'eyes closed', 'face in hands', 'frown', 'gasp', 'glare', 'glaring', 'grimace', 'grin', 'jaw drop', 'laugh', 'licking lip', 'pout', 'scowl', 'smile', 'smirk', 'snarl', 'squint', 'sulking', 'tongue out', 'wide-eyed', 'wince', 'wrinkled nose',
  '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'
])

/**
 * Hume AIの感情タイプ名を正規化して10種類のEMOTION_KEYSにマッピング
 * @param name 感情タイプ名（大文字小文字混在、複合語、括弧付きなど）
 * @returns 正規化された感情キー、またはnull（メタデータの場合）
 */
export function normalizeEmotionName(name: string): EmotionKey | null {
  if (!name || typeof name !== 'string') {
    return null
  }

  // メタデータフィールドを除外
  const nameLower = name.toLowerCase().trim()
  if (METADATA_FIELDS.has(nameLower)) {
    return null
  }

  // 括弧付きの処理（例: "Surprise (negative)" → "surprise"）
  let cleaned = nameLower
    .replace(/\s*\(negative\)/g, '')
    .replace(/\s*\(positive\)/g, '')
    .replace(/\s*\(.*?\)/g, '') // その他の括弧内を削除
    .trim()

  // 複合語の正規化（スペースやハイフンを削除）
  cleaned = cleaned.replace(/[\s\-_]/g, '')

  // 感情タイプマッピング
  const mapping: Record<string, EmotionKey> = {
    // Basic emotions - 直接マッピング
    'surprise': 'surprise',
    'joy': 'joy',
    'happiness': 'joy',
    'sadness': 'sadness',
    'sad': 'sadness',
    'anger': 'anger',
    'angry': 'anger',
    'fear': 'fear',
    'afraid': 'fear',
    'disgust': 'disgust',
    'disgusted': 'disgust',
    
    // Extended emotions
    'calmness': 'calm',
    'calm': 'calm',
    'concentration': 'focus',
    'focus': 'focus',
    'excitement': 'excitement',
    'excited': 'excitement',
    'confusion': 'confusion',
    'confused': 'confusion',
    
    // Positive emotions → joy
    'aestheticappreciation': 'joy',
    'admiration': 'joy',
    'adoration': 'joy',
    'amusement': 'joy',
    'love': 'joy',
    'satisfaction': 'joy',
    'contentment': 'joy',
    'triumph': 'joy',
    'ecstasy': 'joy',
    'relief': 'joy',
    'romance': 'joy',
    'nostalgia': 'joy',
    'gratitude': 'joy',
    'realization': 'joy',
    
    // Negative emotions → sadness
    'disappointment': 'sadness',
    'distress': 'sadness',
    'sympathy': 'sadness',
    'tiredness': 'sadness',
    'empathicpain': 'sadness',
    'pain': 'sadness',
    
    // Anger-related
    'annoyance': 'anger',
    'disapproval': 'anger',
    'rage': 'anger',
    
    // Fear-related
    'anxiety': 'fear',
    'horror': 'fear',
    'guilt': 'fear',
    'shame': 'fear',
    
    // Disgust-related
    'contempt': 'disgust', // contemptはangerとdisgustの両方にマッピング可能だが、disgustを優先
    
    // Confusion-related
    'awkwardness': 'confusion',
    'doubt': 'confusion', // doubtはfearとconfusionの両方にマッピング可能だが、confusionを優先
    'embarrassment': 'confusion',
    
    // Interest/Concentration → focus
    'interest': 'focus',
    'contemplation': 'focus',
    'entrancement': 'focus',
    
    // Determination → excitement
    'determination': 'excitement',
    'enthusiasm': 'excitement',
    'craving': 'excitement',
    'desire': 'excitement',
    
    // Vocal expressions (burst emotions) → joy
    'cackle': 'joy',
    'cheer': 'joy',
    'chuckle': 'joy',
    'laugh': 'joy',
    'giggle': 'joy',
    'hehe': 'joy',
    'haha': 'joy',
    'hah': 'joy',
    'ha': 'joy',
    'snicker': 'joy',
    'yay': 'joy',
    'yippee': 'joy',
    'hurray': 'joy',
    'awe': 'joy',
    
    // Vocal expressions → sadness
    'cry': 'sadness',
    'moan': 'sadness',
    'sob': 'sadness',
    'wail': 'sadness',
    'wheep': 'sadness',
    'whimper': 'sadness',
    'sigh': 'sadness',
    
    // Vocal expressions → anger
    'growl': 'anger',
    'grunt': 'anger',
    'roar': 'anger',
    'scream': 'anger',
    'screech': 'anger',
    'shout': 'anger',
    'shriek': 'anger',
    'grr': 'anger',
    
    // Vocal expressions → fear
    'gasp': 'fear',
    'pant': 'fear',
    'yelp': 'fear',
    'eek': 'fear',
    
    // Vocal expressions → disgust
    'hiss': 'disgust',
    'eww': 'disgust',
    'yuck': 'disgust',
    
    // Vocal expressions → surprise
    'wow': 'surprise',
    'oh': 'surprise',
    'ohh': 'surprise',
    'ooh': 'surprise',
    'ah': 'surprise',
    'aha': 'surprise',
    'ahh': 'surprise',
    'woah': 'surprise',
    
    // Other vocal expressions
    'argh': 'anger',
    'aww': 'joy',
    'ooph': 'surprise',
    'ouch': 'sadness', // pain → sadness
    'oww': 'sadness', // pain → sadness
    'pff': 'disgust',
    'phew': 'calm', // relief → calm
    'tsk': 'anger', // disapproval → anger
    'ugh': 'disgust',
    'uh': 'confusion',
    'uhhuh': 'confusion',
    'umm': 'confusion',
    'hmm': 'confusion',
    'huh': 'confusion',
    'mhm': 'confusion',
    'mmm': 'confusion',
    'whee': 'joy',
    'whew': 'calm', // relief → calm
    'hoot': 'joy',
    'howl': 'anger',
    'snort': 'disgust',
    'yawn': 'sadness', // tiredness → sadness
  }

  // 完全一致を試す
  if (cleaned in mapping) {
    return mapping[cleaned]
  }

  // 部分一致を試す（contains）
  for (const [key, value] of Object.entries(mapping)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return value
    }
  }

  // マッピングが見つからない場合は、cleanedがEMOTION_KEYSに含まれているか確認
  if (EMOTION_KEYS.includes(cleaned as EmotionKey)) {
    return cleaned as EmotionKey
  }

  // デフォルト: マッピングが見つからない場合はnullを返す（メタデータとして扱う）
  return null
}

/**
 * 感情タイプ名がメタデータかどうかを判定
 */
export function isMetadataField(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return true
  }
  const nameLower = name.toLowerCase().trim()
  return METADATA_FIELDS.has(nameLower) || normalizeEmotionName(name) === null
}

