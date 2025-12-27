import { 
  WordNode, 
  WordLink, 
  TimelineDataPoint, 
  GapArea, 
  DensityRegion, 
  DuplicateCandidate, 
  CommonFeatures,
  AnalysisResults
} from './types';

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

/**
 * Activity: Run BDD tests using Cucumber and Playwright
 */
export async function runBDDTestActivity(featurePath?: string): Promise<{ success: boolean; output: string; error?: string }> {
  const bddDirPath = path.resolve(process.cwd(), '../../../tests/bdd');
  const command = featurePath ? `npx cucumber-js ${featurePath}` : 'npm test';

  try {
    const { stdout, stderr } = await execPromise(command, { cwd: bddDirPath });
    return {
      success: true,
      output: stdout + (stderr ? `\nStderr: ${stderr}` : '')
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.message || 'Unknown error during BDD test execution'
    };
  }
}

/**
 * Extracts features from a node for analysis
 */
function extractNodeFeatures(
  node: WordNode,
  emotionVectors: Record<string, number[]>,
  sessionData: TimelineDataPoint[]
): string[] {
  const features: string[] = [];
  const wordData = sessionData.filter(d => d.word === node.label);

  if (wordData.length === 0) return features;

  // Extract major emotions from profile
  const emotionVec = emotionVectors[node.label] || [];
  const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion'];
  const topEmotions = emotionVec
    .map((val, idx) => ({ name: emotionNames[idx] || 'unknown', val }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 3)
    .filter(e => e.val > 0.1);
  
  topEmotions.forEach(e => features.push(`emotion:${e.name}`));

  // Extract reaction time features
  const reactionTimes = wordData.map(d => d.reaction_time).filter((rt): rt is number => rt != null);
  if (reactionTimes.length > 0) {
    const avgRT = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;
    if (avgRT < 500) features.push('fast_response');
    else if (avgRT > 1500) features.push('slow_response');
    else features.push('normal_response');
  }

  // Extract reaction value features
  const reactionValues = wordData.map(d => d.reaction_value).filter((rv): rv is number => rv != null);
  if (reactionValues.length > 0) {
    const avgRV = reactionValues.reduce((sum, rv) => sum + rv, 0) / reactionValues.length;
    if (avgRV > 0.7) features.push('high_reaction');
    else if (avgRV < 0.3) features.push('low_reaction');
  }

  if (wordData.length > 5) features.push('frequent');
  else if (wordData.length === 1) features.push('rare');

  return features;
}

/**
 * Calculates common emotion profile for a set of nodes
 */
function calculateCommonEmotionProfile(
  nearbyNodes: { label: string }[],
  emotionVectors: Record<string, number[]>
): Record<string, number> {
  const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion'];
  const profile: Record<string, number> = {};

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

/**
 * Generates suggested items based on common features
 */
function generateSuggestedItems(
  nearbyNodes: { commonFeatures: string[] }[],
  commonEmotionProfile: Record<string, number>
): string[] {
  const suggestions: string[] = [];

  const topEmotions = Object.entries(commonEmotionProfile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter(([_, val]) => val > 0.2);

  topEmotions.forEach(([emotion]) => {
    suggestions.push(`感情:${emotion}に関連する項目`);
  });

  const commonFeaturesCount = new Map<string, number>();
  nearbyNodes.forEach(n => {
    n.commonFeatures.forEach(f => {
      commonFeaturesCount.set(f, (commonFeaturesCount.get(f) || 0) + 1);
    });
  });

  const topFeatures = Array.from(commonFeaturesCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([feature]) => feature);

  topFeatures.forEach(feature => {
    suggestions.push(`特徴:${feature}を持つ項目`);
  });

  return suggestions.slice(0, 5);
}

/**
 * Activity: Detect gap areas in 3D space
 */
export async function detectGapAreasActivity(
  nodes: WordNode[],
  links: WordLink[],
  emotionVectors: Record<string, number[]>,
  sessionData: TimelineDataPoint[],
  options: {
    minGapRadius?: number;
    maxGapRadius?: number;
    minNearbyNodes?: number;
    gridResolution?: number;
    densityThreshold?: number;
  } = {}
): Promise<GapArea[]> {
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

  for (const node of nodes) {
    if (!node.initial || node.fixed) continue;

    const [x, y, z] = node.initial;
    const gx = Math.floor((x - minX) / gridSizeX);
    const gy = Math.floor((y - minY) / gridSizeY);
    const gz = Math.floor((z - minZ) / gridSizeZ);
    const key = `${gx},${gy},${gz}`;

    gridDensity.set(key, (gridDensity.get(key) || 0) + 1);
  }

  const gapAreas: GapArea[] = [];
  const cellVolume = gridSizeX * gridSizeY * gridSizeZ;
  const avgDensity = positions.length / (rangeX * rangeY * rangeZ + 1e-6);

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
            const distance = Math.hypot(nx - centerX, ny - centerY, nz - centerZ);

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
              (nearbyNodes.length / (minNearbyNodes * 2)) * (1 - relativeDensity)
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

/**
 * Activity: Analyze node density
 */
export async function analyzeDensityActivity(
  nodes: WordNode[],
  options: {
    overcrowdingThreshold?: number;
    sparseThreshold?: number;
    gridResolution?: number;
    minRegionNodes?: number;
  } = {}
): Promise<{ overcrowdedRegions: DensityRegion[]; sparseRegions: DensityRegion[]; overallDensity: number }> {
  const {
    overcrowdingThreshold = 1.5,
    sparseThreshold = 0.5,
    gridResolution = 30,
    minRegionNodes = 3
  } = options;

  const positions = nodes
    .filter(n => n.initial && !n.fixed)
    .map(n => ({ node: n, pos: n.initial! }));

  if (positions.length === 0) {
    return { overcrowdedRegions: [], sparseRegions: [], overallDensity: 0 };
  }

  const minX = Math.min(...positions.map(p => p.pos[0]));
  const maxX = Math.max(...positions.map(p => p.pos[0]));
  const minY = Math.min(...positions.map(p => p.pos[1]));
  const maxY = Math.max(...positions.map(p => p.pos[1]));
  const minZ = Math.min(...positions.map(p => p.pos[2]));
  const maxZ = Math.max(...positions.map(p => p.pos[2]));

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const rangeZ = maxZ - minZ;
  const totalVolume = rangeX * rangeY * rangeZ;
  const overallDensity = positions.length / (totalVolume + 1e-6);

  const gridSizeX = rangeX / gridResolution;
  const gridSizeY = rangeY / gridResolution;
  const gridSizeZ = rangeZ / gridResolution;
  const cellVolume = gridSizeX * gridSizeY * gridSizeZ;

  const gridCells: Map<string, { density: number; nodes: WordNode[]; center: [number, number, number] }> = new Map();

  for (const { node, pos } of positions) {
    const gx = Math.floor((pos[0] - minX) / gridSizeX);
    const gy = Math.floor((pos[1] - minY) / gridSizeY);
    const gz = Math.floor((pos[2] - minZ) / gridSizeZ);
    const key = `${gx},${gy},${gz}`;

    if (!gridCells.has(key)) {
      gridCells.set(key, {
        density: 0,
        nodes: [],
        center: [minX + (gx + 0.5) * gridSizeX, minY + (gy + 0.5) * gridSizeY, minZ + (gz + 0.5) * gridSizeZ]
      });
    }

    const cell = gridCells.get(key)!;
    cell.nodes.push(node);
    cell.density = cell.nodes.length / cellVolume;
  }

  const overcrowdedRegions: DensityRegion[] = [];
  const sparseRegions: DensityRegion[] = [];

  for (const [key, cell] of gridCells.entries()) {
    if (cell.nodes.length < minRegionNodes) continue;

    const relativeDensity = cell.density / (overallDensity + 1e-6);

    if (relativeDensity >= overcrowdingThreshold) {
      const radius = Math.cbrt(cellVolume) * 0.5;
      overcrowdedRegions.push({
        id: `overcrowded_${key}`,
        center: cell.center,
        radius,
        nodeCount: cell.nodes.length,
        density: cell.density,
        isOvercrowded: true,
        suggestedSeparation: radius * 1.2,
        nodes: cell.nodes
      });
    } else if (relativeDensity <= sparseThreshold) {
      sparseRegions.push({
        id: `sparse_${key}`,
        center: cell.center,
        radius: Math.cbrt(cellVolume) * 0.5,
        nodeCount: cell.nodes.length,
        density: cell.density,
        isOvercrowded: false,
        nodes: cell.nodes
      });
    }
  }

  return {
    overcrowdedRegions: overcrowdedRegions.sort((a, b) => b.density - a.density).slice(0, 10),
    sparseRegions: sparseRegions.sort((a, b) => a.density - b.density).slice(0, 10),
    overallDensity
  };
}

/**
 * Activity: Detect duplicate nodes
 */
export async function detectDuplicatesActivity(
  nodes: WordNode[],
  emotionVectors: Record<string, number[]>,
  sessionData: TimelineDataPoint[],
  options: {
    distanceThreshold?: number;
    spatialDistanceThreshold?: number;
    minSimilarity?: number;
  } = {}
): Promise<DuplicateCandidate[]> {
  const {
    distanceThreshold = 0.15,
    spatialDistanceThreshold = 30,
    minSimilarity = 0.85
  } = options;

  const candidates: DuplicateCandidate[] = [];
  const wordNodes = nodes.filter(n => n.nodeType === 'word' && n.initial);

  for (let i = 0; i < wordNodes.length; i++) {
    for (let j = i + 1; j < wordNodes.length; j++) {
      const node1 = wordNodes[i];
      const node2 = wordNodes[j];

      if (!node1.initial || !node2.initial) continue;

      const [x1, y1, z1] = node1.initial;
      const [x2, y2, z2] = node2.initial;
      const spatialDist = Math.hypot(x2 - x1, y2 - y1, z2 - z1);

      if (spatialDist > spatialDistanceThreshold) continue;

      const vec1 = emotionVectors[node1.label] || [];
      const vec2 = emotionVectors[node2.label] || [];

      if (vec1.length === 0 || vec2.length === 0) continue;

      const dot = vec1.reduce((sum, v, idx) => sum + v * (vec2[idx] || 0), 0);
      const norm1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
      const norm2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
      const cosineSim = (norm1 > 0 && norm2 > 0) ? dot / (norm1 * norm2) : 0;

      if (cosineSim >= minSimilarity && (1 - cosineSim) <= distanceThreshold) {
        const commonEmotionProfile = calculateCommonEmotionProfile([node1, node2], emotionVectors);
        const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion'];
        
        const semanticTags = Object.entries(commonEmotionProfile)
          .filter(([_, val]) => val > 0.2)
          .map(([name]) => name)
          .slice(0, 5);

        const wordData1 = sessionData.filter(d => d.word === node1.label);
        const wordData2 = sessionData.filter(d => d.word === node2.label);
        const allWordData = [...wordData1, ...wordData2];

        const frequencies = [wordData1.length, wordData2.length];
        const reactionTimes = allWordData.map(d => d.reaction_time).filter((rt): rt is number => rt != null);
        const reactionValues = allWordData.map(d => d.reaction_value).filter((rv): rv is number => rv != null);

        candidates.push({
          id: `dup_${node1.id}_${node2.id}`,
          nodeIds: [node1.id, node2.id],
          labels: [node1.label, node2.label],
          similarity: cosineSim,
          commonFeatures: {
            emotionProfile: commonEmotionProfile,
            semanticTags,
            frequencyRange: [Math.min(...frequencies), Math.max(...frequencies)],
            reactionTimeRange: reactionTimes.length > 0 ? [Math.min(...reactionTimes), Math.max(...reactionTimes)] : [0, 0],
            reactionValueRange: reactionValues.length > 0 ? [Math.min(...reactionValues), Math.max(...reactionValues)] : [0, 0]
          },
          suggestedMerge: cosineSim >= 0.9 && spatialDist < spatialDistanceThreshold * 0.5,
          distance: spatialDist
        });
      }
    }
  }

  return candidates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Main Activity: Run all structure analysis
 */
export async function runStructureAnalysisActivity(
  nodes: WordNode[],
  links: WordLink[],
  emotionVectors: Record<string, number[]>,
  sessionData: TimelineDataPoint[]
): Promise<AnalysisResults> {
  const [gapAreas, densityResults, duplicates] = await Promise.all([
    detectGapAreasActivity(nodes, links, emotionVectors, sessionData),
    analyzeDensityActivity(nodes),
    detectDuplicatesActivity(nodes, emotionVectors, sessionData)
  ]);

  return {
    gapAreas,
    densityRegions: [...densityResults.overcrowdedRegions, ...densityResults.sparseRegions],
    duplicates,
    overallDensity: densityResults.overallDensity
  };
}

