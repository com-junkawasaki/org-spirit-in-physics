// Type definitions for visualization components (Svelte version)
// Compatible with React version types from @visualization-components

// TimelinePoint (Svelte version - uses time as string)
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

// TimelineDataPoint (React version compatible - uses timestamp as number)
export interface TimelineDataPoint {
	timestamp: number;
	word: string;
	reactionTime: number;
	hasResponse: boolean;
	emotions?: EmotionData[];
	physiological: { average?: number; max?: number; min?: number } | unknown[];
	reactionValue: number;
	eventType?: string;
	metadata?: { emotionCount?: number; physiologicalCount?: number };
}

// Helper function to convert TimelinePoint to TimelineDataPoint
export function convertTimelinePointToDataPoint(point: TimelinePoint): TimelineDataPoint {
	const physiologicalValues: number[] = [];
	if (Array.isArray(point.physiological)) {
		point.physiological.forEach((p) => {
			if (p && typeof p === 'object' && 'value' in p) {
				const val = (p as any).value;
				if (typeof val === 'number' && !isNaN(val)) {
					physiologicalValues.push(val);
				}
			}
		});
	}

	const physiological = physiologicalValues.length > 0
		? {
				average: physiologicalValues.reduce((sum, v) => sum + v, 0) / physiologicalValues.length,
				max: Math.max(...physiologicalValues),
				min: Math.min(...physiologicalValues)
			}
		: { average: 0, max: 0, min: 0 };

	return {
		timestamp: new Date(point.time).getTime(),
		word: point.word || '',
		reactionTime: point.reactionTime || 0,
		hasResponse: point.hasResponse,
		emotions: point.emotions,
		physiological,
		reactionValue: point.reactionValue || 0,
		eventType: point.eventType,
		metadata: point.metadata
	};
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
	position?: [number, number, number];
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

// Filter Settings
export interface FilterSettings {
	emotions: boolean;
	physiological: boolean;
	reactionValues: boolean;
	wordDisplay: boolean;
	reactionTime: boolean;
	physiologicalThreshold: boolean;
	emotionChange: boolean;
	range: number;
	timeScale: number;
	verticalScale: number;
	showEmotionDetails: boolean;
	showWordLabels: boolean;
}

// Time Range
export interface TimeRange {
	start: number;
	end: number;
}

// Visualization Mode
export type VisualizationMode = 'timeline' | 'kpi' | 'dumbbell' | 'small-multiples' | 'force-3d-typegpu';

// KPI Calculations
export interface KPICalculations {
	current: {
		avgReactionTime: number;
		avgReactionValue: number;
		responseRate: number;
		totalResponses: number;
	};
	previous: {
		avgReactionTime: number;
		avgReactionValue: number;
		responseRate: number;
		totalResponses: number;
	};
	changes: {
		avgReactionTime: number;
		avgReactionValue: number;
		responseRate: number;
		totalResponses: number;
	};
}

// Dumbbell Data Point
export interface DumbbellDataPoint {
	word: string;
	firstHalf: {
		avgReactionTime: number;
		avgReactionValue: number;
		count: number;
	};
	secondHalf: {
		avgReactionTime: number;
		avgReactionValue: number;
		count: number;
	};
}

// Small Multiples Data Point
export interface SmallMultiplesDataPoint {
	word: string;
	data: TimelineDataPoint[];
	stats: {
		avgReactionTime: number;
		avgReactionValue: number;
		maxReactionValue: number;
		responseRate: number;
	};
}

// Force Preset
export interface ForcePreset {
	id: string;
	label: string;
	springK: number;
	repulsionK: number;
	restLength: number;
	damping: number;
	emoWeak: number;
	emoStrong: number;
	emoGain: number;
}

// Word Distance Pair
export interface WordDistancePair {
	word1: string;
	word2: string;
	totalDistance: number;
	emotionDistance: number;
	reactionValueDistance: number;
	reactionTimeDistance: number;
	physiologicalDistance: number;
}

// Gap Area (for structure analysis)
export interface GapArea {
	id: string;
	center: [number, number, number];
	radius: number;
	nearbyNodes: Array<{
		nodeId: string;
		label: string;
		distance: number;
		commonFeatures: string[];
	}>;
	suggestedItems: string[];
	confidence: number;
	commonEmotionProfile?: Record<string, number>;
}

// Density Region
export interface DensityRegion {
	id: string;
	center: [number, number, number];
	radius: number;
	density: number;
	nodes: Array<{
		nodeId: string;
		label: string;
		distance: number;
	}>;
	isOvercrowded?: boolean;
	nodeCount?: number;
	suggestedSeparation?: number;
}

// Duplicate Candidate
export interface DuplicateCandidate {
	id: string;
	word1: string;
	word2: string;
	similarity: number;
	distance: number;
	commonFeatures: string[] | CommonFeatures;
	labels?: string[];
	suggestedMerge?: boolean;
}
