// Structure analysis utilities for 3D Force visualization
// Compatible with React version from @visualization-components

import type { WordNode, WordLink, TimelineDataPoint, GapArea, DensityRegion, DuplicateCandidate, CommonFeatures } from '../types';

/**
 * 3D空間内の空白エリアを検出
 */
export function detectGapAreas(
	nodes: WordNode[],
	_links: WordLink[],
	emotionVectors: Record<string, number[]>,
	sessionData: TimelineDataPoint[],
	options: {
		minGapRadius?: number;
		maxGapRadius?: number;
		minNearbyNodes?: number;
		gridResolution?: number;
		densityThreshold?: number;
	} = {}
): GapArea[] {
	const {
		minGapRadius = 50,
		maxGapRadius = 200,
		minNearbyNodes = 3,
		gridResolution = 50,
		densityThreshold = 0.1
	} = options;

	const positions = nodes
		.filter(n => n.initial && !n.fixed)
		.map(n => n.initial!);

	if (positions.length === 0) return [];

	const minX = Math.min(...positions.map(p => p[0]));
	const maxX = Math.max(...positions.map(p => p[0]));
	const minY = Math.min(...positions.map(p => p[1]));
	const maxY = Math.max(...positions.map(p => p[1]));
	const minZ = Math.min(...positions.map(p => p[2]));
	const maxZ = Math.max(...positions.map(p => p[2]));

	const rangeX = maxX - minX;
	const rangeY = maxY - minY;
	const rangeZ = maxZ - minZ;

	const gridSizeX = rangeX / gridResolution;
	const gridSizeY = rangeY / gridResolution;
	const gridSizeZ = rangeZ / gridResolution;

	const gridDensity: Map<string, number> = new Map();
	const gridNodes: Map<string, WordNode[]> = new Map();

	for (const node of nodes) {
		if (!node.initial || node.fixed) continue;

		const [x, y, z] = node.initial;
		const gx = Math.floor((x - minX) / gridSizeX);
		const gy = Math.floor((y - minY) / gridSizeY);
		const gz = Math.floor((z - minZ) / gridSizeZ);
		const key = `${gx},${gy},${gz}`;

		gridDensity.set(key, (gridDensity.get(key) || 0) + 1);
		if (!gridNodes.has(key)) gridNodes.set(key, []);
		gridNodes.get(key)!.push(node);
	}

	const gapAreas: GapArea[] = [];
	const cellVolume = gridSizeX * gridSizeY * gridSizeZ;
	const avgDensity = positions.length / (rangeX * rangeY * rangeZ);

	for (let gx = 0; gx < gridResolution; gx++) {
		for (let gy = 0; gy < gridResolution; gy++) {
			for (let gz = 0; gz < gridResolution; gz++) {
				const key = `${gx},${gy},${gz}`;
				const density = (gridDensity.get(key) || 0) / cellVolume;
				const relativeDensity = density / (avgDensity + 1e-6);

				if (relativeDensity < densityThreshold) {
					const centerX = minX + (gx + 0.5) * gridSizeX;
					const centerY = minY + (gy + 0.5) * gridSizeY;
					const centerZ = minZ + (gz + 0.5) * gridSizeZ;
					const center: [number, number, number] = [centerX, centerY, centerZ];

					const nearbyNodes: GapArea['nearbyNodes'] = [];
					for (const node of nodes) {
						if (!node.initial || node.fixed) continue;

						const [nx, ny, nz] = node.initial;
						const dx = nx - centerX;
						const dy = ny - centerY;
						const dz = nz - centerZ;
						const distance = Math.hypot(dx, dy, dz);

						if (distance >= minGapRadius && distance <= maxGapRadius) {
							const commonFeatures = extractNodeFeatures(node, emotionVectors, sessionData);
							nearbyNodes.push({
								nodeId: node.id,
								label: node.label,
								distance,
								commonFeatures
							});
						}
					}

					if (nearbyNodes.length >= minNearbyNodes) {
						const commonEmotionProfile = calculateCommonEmotionProfile(nearbyNodes, emotionVectors);
						const suggestedItems = generateSuggestedItems(nearbyNodes, commonEmotionProfile);

						const confidence = Math.min(1,
							(nearbyNodes.length / (minNearbyNodes * 2)) *
							(1 - relativeDensity)
						);

						gapAreas.push({
							id: `gap_${gx}_${gy}_${gz}`,
							center,
							radius: Math.max(minGapRadius, Math.min(maxGapRadius,
								nearbyNodes.reduce((sum, n) => sum + n.distance, 0) / nearbyNodes.length * 0.5
							)),
							nearbyNodes: nearbyNodes.sort((a, b) => a.distance - b.distance).slice(0, 10),
							suggestedItems,
							confidence,
							commonEmotionProfile
						});
					}
				}
			}
		}
	}

	return gapAreas.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

function extractNodeFeatures(
	node: WordNode,
	emotionVectors: Record<string, number[]>,
	sessionData: TimelineDataPoint[]
): string[] {
	const features: string[] = [];
	const wordData = sessionData.filter(d => d.word === node.label);

	if (wordData.length === 0) return features;

	const emotionVec = emotionVectors[node.label] || [];
	const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion'];
	const topEmotions = emotionVec
		.map((val, idx) => ({ name: emotionNames[idx] || 'unknown', val }))
		.sort((a, b) => b.val - a.val)
		.slice(0, 3)
		.filter(e => e.val > 0.1);

	topEmotions.forEach(e => features.push(`emotion:${e.name}`));

	const reactionTimes = wordData.map(d => d.reactionTime).filter((rt): rt is number => rt != null);
	if (reactionTimes.length > 0) {
		const avgRT = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;
		if (avgRT < 500) features.push('fast_response');
		else if (avgRT > 1500) features.push('slow_response');
		else features.push('normal_response');
	}

	const reactionValues = wordData.map(d => d.reactionValue).filter((rv): rv is number => rv != null);
	if (reactionValues.length > 0) {
		const avgRV = reactionValues.reduce((sum, rv) => sum + rv, 0) / reactionValues.length;
		if (avgRV > 0.7) features.push('high_reaction');
		else if (avgRV < 0.3) features.push('low_reaction');
	}

	if (wordData.length > 5) features.push('frequent');
	else if (wordData.length === 1) features.push('rare');

	return features;
}

function calculateCommonEmotionProfile(
	nearbyNodes: GapArea['nearbyNodes'],
	emotionVectors: Record<string, number[]>
): Record<string, number> {
	const profile: Record<string, number> = {};
	const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion'];

	emotionNames.forEach((name, idx) => {
		const values = nearbyNodes
			.map(n => emotionVectors[n.label]?.[idx] || 0)
			.filter(v => v > 0);
		if (values.length > 0) {
			profile[name] = values.reduce((sum, v) => sum + v, 0) / values.length;
		}
	});

	return profile;
}

function generateSuggestedItems(
	nearbyNodes: GapArea['nearbyNodes'],
	commonEmotionProfile: Record<string, number>
): string[] {
	const suggestions: string[] = [];
	const topEmotions = Object.entries(commonEmotionProfile)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([name]) => name);

	suggestions.push(...topEmotions.map(e => `emotion:${e}`));
	return suggestions;
}

/**
 * 近接ノード群の共通特徴を抽出
 */
export function extractCommonFeatures(
	nodeIds: string[],
	nodes: WordNode[],
	emotionVectors: Record<string, number[]>,
	sessionData: TimelineDataPoint[]
): CommonFeatures {
	const targetNodes = nodes.filter(n => nodeIds.includes(n.id));
	const targetWords = targetNodes.map(n => n.label);

	const emotionProfile: Record<string, number> = {};
	const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion'];

	emotionNames.forEach((name, idx) => {
		const values = targetWords
			.map(word => emotionVectors[word]?.[idx] || 0)
			.filter(v => v > 0);
		if (values.length > 0) {
			emotionProfile[name] = values.reduce((sum, v) => sum + v, 0) / values.length;
		}
	});

	const frequencies = targetWords.map(word =>
		sessionData.filter(d => d.word === word).length
	);
	const frequencyRange: [number, number] = [
		Math.min(...frequencies),
		Math.max(...frequencies)
	];

	const reactionTimes = targetWords
		.flatMap(word => sessionData
			.filter(d => d.word === word)
			.map(d => d.reactionTime)
			.filter((rt): rt is number => rt != null)
		);
	const reactionTimeRange: [number, number] = reactionTimes.length > 0
		? [Math.min(...reactionTimes), Math.max(...reactionTimes)]
		: [0, 0];

	const reactionValues = targetWords
		.flatMap(word => sessionData
			.filter(d => d.word === word)
			.map(d => d.reactionValue)
			.filter((rv): rv is number => rv != null)
		);
	const reactionValueRange: [number, number] = reactionValues.length > 0
		? [Math.min(...reactionValues), Math.max(...reactionValues)]
		: [0, 0];

	const semanticTags = Object.entries(emotionProfile)
		.filter(([_, val]) => val > 0.2)
		.map(([name, _]) => name)
		.slice(0, 5);

	return {
		emotionProfile,
		semanticTags,
		frequencyRange,
		reactionTimeRange,
		reactionValueRange
	};
}

/**
 * 密度分析（密集/分散領域の特定）
 */
export function analyzeDensity(
	nodes: WordNode[],
	options: {
		gridResolution?: number;
		densityThreshold?: number;
	} = {}
): DensityRegion[] {
	const {
		gridResolution = 20,
		densityThreshold = 1.5
	} = options;

	const positions = nodes
		.filter(n => n.initial && !n.fixed)
		.map(n => n.initial!);

	if (positions.length === 0) return [];

	const minX = Math.min(...positions.map(p => p[0]));
	const maxX = Math.max(...positions.map(p => p[0]));
	const minY = Math.min(...positions.map(p => p[1]));
	const maxY = Math.max(...positions.map(p => p[1]));
	const minZ = Math.min(...positions.map(p => p[2]));
	const maxZ = Math.max(...positions.map(p => p[2]));

	const rangeX = maxX - minX;
	const rangeY = maxY - minY;
	const rangeZ = maxZ - minZ;

	const gridSizeX = rangeX / gridResolution;
	const gridSizeY = rangeY / gridResolution;
	const gridSizeZ = rangeZ / gridResolution;

	const gridDensity: Map<string, number> = new Map();
	const gridNodes: Map<string, WordNode[]> = new Map();

	for (const node of nodes) {
		if (!node.initial || node.fixed) continue;

		const [x, y, z] = node.initial;
		const gx = Math.floor((x - minX) / gridSizeX);
		const gy = Math.floor((y - minY) / gridSizeY);
		const gz = Math.floor((z - minZ) / gridSizeZ);
		const key = `${gx},${gy},${gz}`;

		gridDensity.set(key, (gridDensity.get(key) || 0) + 1);
		if (!gridNodes.has(key)) gridNodes.set(key, []);
		gridNodes.get(key)!.push(node);
	}

	const regions: DensityRegion[] = [];
	const cellVolume = gridSizeX * gridSizeY * gridSizeZ;
	const avgDensity = positions.length / (rangeX * rangeY * rangeZ);

	for (const [key, density] of gridDensity.entries()) {
		const relativeDensity = (density / cellVolume) / (avgDensity + 1e-6);

		if (relativeDensity >= densityThreshold) {
			const [gx, gy, gz] = key.split(',').map(Number);
			const centerX = minX + (gx + 0.5) * gridSizeX;
			const centerY = minY + (gy + 0.5) * gridSizeY;
			const centerZ = minZ + (gz + 0.5) * gridSizeZ;

			const nodesInRegion = gridNodes.get(key) || [];
			const radius = Math.max(gridSizeX, gridSizeY, gridSizeZ) * 0.5;

			regions.push({
				id: `density_${key}`,
				center: [centerX, centerY, centerZ],
				radius,
				density: relativeDensity,
				nodes: nodesInRegion.map(n => ({
					nodeId: n.id,
					label: n.label,
					distance: 0
				}))
			});
		}
	}

	return regions.sort((a, b) => b.density - a.density).slice(0, 10);
}

/**
 * 重複項目の検出
 */
export function detectDuplicates(
	nodes: WordNode[],
	emotionVectors: Record<string, number[]>,
	options: {
		similarityThreshold?: number;
		distanceThreshold?: number;
	} = {}
): DuplicateCandidate[] {
	const {
		similarityThreshold = 0.8,
		distanceThreshold = 50
	} = options;

	const candidates: DuplicateCandidate[] = [];

	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const node1 = nodes[i];
			const node2 = nodes[j];

			if (!node1.initial || !node2.initial) continue;

			const [x1, y1, z1] = node1.initial;
			const [x2, y2, z2] = node2.initial;
			const distance = Math.hypot(x2 - x1, y2 - y1, z2 - z1);

			if (distance > distanceThreshold) continue;

			const vec1 = emotionVectors[node1.label] || [];
			const vec2 = emotionVectors[node2.label] || [];

			if (vec1.length === 0 || vec2.length === 0) continue;

			const dot = vec1.reduce((sum, v, idx) => sum + v * (vec2[idx] || 0), 0);
			const norm1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
			const norm2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
			const similarity = norm1 > 0 && norm2 > 0 ? dot / (norm1 * norm2) : 0;

			if (similarity >= similarityThreshold) {
				const commonFeatures = extractNodeFeatures(node1, emotionVectors, []);
				candidates.push({
					id: `dup_${node1.id}_${node2.id}`,
					word1: node1.label,
					word2: node2.label,
					similarity,
					distance,
					commonFeatures
				});
			}
		}
	}

	return candidates.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
}

