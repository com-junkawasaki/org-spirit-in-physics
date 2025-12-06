// Emotion name normalization utility

export const EMOTION_KEYS = [
	'joy',
	'sadness',
	'anger',
	'fear',
	'surprise',
	'disgust',
	'calm',
	'focus',
	'excitement',
	'confusion'
] as const;

export type EmotionKey = (typeof EMOTION_KEYS)[number];

const EMOTION_MAP: Record<string, EmotionKey> = {
	// Joy variations
	joy: 'joy',
	happiness: 'joy',
	happy: 'joy',
	elated: 'joy',
	euphoric: 'joy',
	pleased: 'joy',
	content: 'joy',
	// Sadness variations
	sadness: 'sadness',
	sad: 'sadness',
	unhappy: 'sadness',
	depressed: 'sadness',
	melancholy: 'sadness',
	// Anger variations
	anger: 'anger',
	angry: 'anger',
	mad: 'anger',
	furious: 'anger',
	irritated: 'anger',
	// Fear variations
	fear: 'fear',
	afraid: 'fear',
	scared: 'fear',
	anxious: 'fear',
	worried: 'fear',
	// Surprise variations
	surprise: 'surprise',
	surprised: 'surprise',
	shocked: 'surprise',
	amazed: 'surprise',
	// Disgust variations
	disgust: 'disgust',
	disgusted: 'disgust',
	revolted: 'disgust',
	// Calm variations
	calm: 'calm',
	calmness: 'calm',
	peaceful: 'calm',
	relaxed: 'calm',
	// Focus variations
	focus: 'focus',
	focused: 'focus',
	concentrated: 'focus',
	determined: 'focus',
	// Excitement variations
	excitement: 'excitement',
	excited: 'excitement',
	enthusiastic: 'excitement',
	// Confusion variations
	confusion: 'confusion',
	confused: 'confusion',
	puzzled: 'confusion'
};

export function normalizeEmotionName(name: string): EmotionKey {
	const normalized = name.toLowerCase().trim();
	return EMOTION_MAP[normalized] || 'joy'; // Default to joy if not found
}
