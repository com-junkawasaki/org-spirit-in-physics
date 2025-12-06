// Type definitions for visualization components (Svelte version)

export interface TimelinePoint {
	time: string;
	participantId: string;
	sessionId: string;
	word?: string;
	eventType?: string;
	reactionValue?: number;
	reactionTime?: number;
	hasResponse: boolean;
	emotions: EmotionData[];
	physiological: PhysiologicalData[];
	metadata: Record<string, any>;
}

export interface EmotionData {
	name: string;
	score: number;
	fileType: string;
	color?: string;
}

export interface PhysiologicalData {
	timestamp?: string;
	value?: number;
	metadata?: Record<string, any>;
}

export interface WordAggregate {
	participantId: string;
	sessionId: string;
	word: string;
	count: number;
	avgReactionValue?: number;
	sumReactionValue?: number;
	avgReactionTime?: number;
	sumReactionTime?: number;
	avgPhysiological?: number;
	sumPhysAbs?: number;
	physSeries?: number[];
	rtSeries?: number[];
	rvSeries?: number[];
	firstTime: string;
	lastTime: string;
}

export interface EmotionVector {
	participantId: string;
	sessionId: string;
	word: string;
	joySum?: number;
	sadnessSum?: number;
	angerSum?: number;
	fearSum?: number;
	surpriseSum?: number;
	disgustSum?: number;
	calmSum?: number;
	focusSum?: number;
	excitementSum?: number;
	confusionSum?: number;
	emotionEntryCount: number;
	emotionByModality?: Record<string, any>;
}

export interface WordNode {
	id: string;
	label: string;
	scale: number;
	axis?: [number, number, number];
	fixed?: boolean;
	initial?: [number, number, number];
	color?: string;
	nodeType?: string;
	emotion?: Partial<
		Record<
			| 'joy'
			| 'sadness'
			| 'anger'
			| 'fear'
			| 'surprise'
			| 'disgust'
			| 'calm'
			| 'focus'
			| 'excitement'
			| 'confusion',
			number
		>
	>;
}

export interface WordLink {
	source: number;
	target: number;
	weight: number;
	color?: string;
	mode?: 'tension' | 'compression';
	L0?: number;
	k?: number;
}
