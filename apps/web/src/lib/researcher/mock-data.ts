// Mock data generator for 3D Force visualization testing
import type { TimelineDataPoint, EmotionData } from '../components/researcher/types'

const MOCK_WORDS = [
  '頭', '緑', '水', '歌う', '亡くなる', '長い', '船', '支払い', '窓', '親切',
  '医者', '大声', '子供', '遅い', '苦い', '槌', '山', '家', '黒', '羊',
  'インク', '病気', '針', '泳ぐ', '旅', '青', '灯', '罪', '健康', '誇り',
  '料理', 'イソク', '塩', '新しい', '習慣', '祈り', '金', '馬', '糸', '美しい',
  '買う', '愚か', '小冊子', '飢え', '司祭', '悲しみ', '純粋', '問う', '野生', '冷たい',
  '茎', '踊る', '村', '湖', '病んだ', '転ぶ', '誇る', 'マツチ', 'かみそり', '渇く',
  '都市', '広い', '宗教', '囁く', '子供', '冷たい', '打つ', '通り', '幸せ', '恐怖',
  '柔らかい', '食べる', '白', '眠い', '怒り', '絨毯', 'カーペット', 'カオフツ', '少女', '苦しむ',
  '高い', 'ヤマ', '嫌悪', '椅子', '甘い', '働く', '空腹', '白', '摘む', '友達',
  '鳥', '塩', '新しい', '長い', '聖書', '記憶', '羊', '浴する', '小屋', '頭'
]

const EMOTION_TYPES = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion']
const MODALITY_TYPES = ['prosody', 'burst', 'face', 'language']

function randomEmotions(): EmotionData[] {
  const count = Math.floor(Math.random() * 5) + 1
  const emotions: EmotionData[] = []
  
  for (let i = 0; i < count; i++) {
    const emotion = EMOTION_TYPES[Math.floor(Math.random() * EMOTION_TYPES.length)]
    const modality = MODALITY_TYPES[Math.floor(Math.random() * MODALITY_TYPES.length)]
    emotions.push({
      name: emotion,
      score: Math.random() * 0.8 + 0.2,
      fileType: modality
    })
  }
  
  return emotions
}

export function generateMockTimelineData(count: number = 100): TimelineDataPoint[] {
  const baseTime = Date.now() - 1000 * 60 * 60 // 1 hour ago
  const data: TimelineDataPoint[] = []
  
  for (let i = 0; i < count; i++) {
    const word = MOCK_WORDS[Math.floor(Math.random() * MOCK_WORDS.length)]
    data.push({
      timestamp: baseTime + i * 1000 * 5, // 5 seconds apart
      word,
      reactionTime: Math.random() * 3000 + 500, // 500ms to 3500ms
      hasResponse: Math.random() > 0.1,
      emotions: randomEmotions(),
      physiological: [
        { value: Math.random() * 100 + 60, measurementType: 'heart_rate' },
        { value: Math.random() * 50 + 10, measurementType: 'skin_conductance' }
      ],
      reactionValue: Math.random() * 10 - 5, // -5 to 5
      eventType: 'stimulus',
      metadata: {}
    })
  }
  
  return data
}

export function generateMockEmotionVectors() {
  return MOCK_WORDS.map(word => ({
    word,
    joySum: Math.random() * 5,
    sadnessSum: Math.random() * 5,
    angerSum: Math.random() * 5,
    fearSum: Math.random() * 5,
    surpriseSum: Math.random() * 5,
    disgustSum: Math.random() * 5,
    calmSum: Math.random() * 5,
    focusSum: Math.random() * 5,
    excitementSum: Math.random() * 5,
    confusionSum: Math.random() * 5,
    emotionEntryCount: Math.floor(Math.random() * 10) + 1
  }))
}

export function generateMockWordStatistics() {
  return MOCK_WORDS.map(word => ({
    word,
    count: Math.floor(Math.random() * 10) + 1,
    avgReactionTime: Math.random() * 2000 + 1000,
    stdReactionTime: Math.random() * 500,
    varReactionTime: Math.random() * 250000,
    avgReactionValue: Math.random() * 10 - 5,
    stdReactionValue: Math.random() * 2,
    varReactionValue: Math.random() * 4,
    avgPhysiological: Math.random() * 100 + 60,
    stdPhysiological: Math.random() * 20,
    varPhysiological: Math.random() * 400,
    speedIndex: Math.random(),
    physSeries: Array.from({ length: 10 }, () => Math.random() * 100 + 60),
    rtSeries: Array.from({ length: 10 }, () => Math.random() * 2000 + 1000)
  }))
}

