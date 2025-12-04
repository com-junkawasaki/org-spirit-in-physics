// Merkle DAG: lib.visualization_data
// Data transformation for 3D visualization of Spirit Type and Ghost Pattern

import type { SpiritType, GhostPattern } from '../../types/paper/experimental';

// WordNode and WordLink types matching Force3DWordGraphTypeGPU
export interface WordNode {
  id: string;
  label: string;
  scale: number;
  axis?: [number, number, number];
  fixed?: boolean;
  initial?: [number, number, number];
  color?: string;
  emotion?: Partial<Record<'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'calm' | 'focus' | 'excitement' | 'confusion', number>>;
  // Spirit Type/Ghost Pattern metadata
  classificationType?: 'spirit-type' | 'ghost-pattern';
  archetype?: string;
  shadowType?: 'individual' | 'collective';
  geneComponent?: number;
  memeComponent?: number;
  fieldComponent?: number;
}

export interface WordLink {
  source: number;
  target: number;
  weight: number;
  mode?: 'tension' | 'compression';
  L0?: number;
  k?: number;
}

/**
 * Convert Spirit Type to WordNode
 */
function spiritTypeToWordNode(spiritType: SpiritType, index: number): WordNode {
  // Use first word pair for label
  const firstPair = spiritType.wordPairs[0];
  const label = firstPair
    ? `${firstPair.stimulusWord} → ${firstPair.responseWord}`
    : `Spirit Type ${index}`;

  // Scale based on distance to archetype (closer = larger)
  const scale = Math.max(0.5, 2.0 - spiritType.distanceToArchetype);

  // Color based on archetype (typical patterns = blue/green)
  const color = '#4A90E2'; // Blue for Spirit Type

  // Extract emotion data from word pairs if available
  const emotion: Partial<Record<'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'calm' | 'focus' | 'excitement' | 'confusion', number>> = {};

  return {
    id: spiritType.id,
    label,
    scale,
    color,
    emotion,
    classificationType: 'spirit-type',
    archetype: spiritType.archetype,
    geneComponent: spiritType.geneComponent[0] ?? 0,
    memeComponent: spiritType.memeComponent[0] ?? 0,
    fieldComponent: spiritType.fieldComponent[0] ?? 0,
  };
}

/**
 * Convert Ghost Pattern to WordNode
 */
function ghostPatternToWordNode(ghostPattern: GhostPattern, index: number): WordNode {
  // Use first word pair for label
  const firstPair = ghostPattern.wordPairs[0];
  const label = firstPair
    ? `${firstPair.stimulusWord} → ${firstPair.responseWord}`
    : `Ghost Pattern ${index}`;

  // Scale based on distance to hidden pattern (further = larger, indicating problematic)
  const scale = Math.max(0.5, 1.0 + ghostPattern.distanceToHiddenPattern * 0.5);

  // Color based on shadow type (individual = red, collective = orange)
  const color = ghostPattern.shadowType === 'individual' ? '#E74C3C' : '#F39C12';

  // Extract emotion data from word pairs if available
  const emotion: Partial<Record<'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'calm' | 'focus' | 'excitement' | 'confusion', number>> = {};

  return {
    id: ghostPattern.id,
    label,
    scale,
    color,
    emotion,
    classificationType: 'ghost-pattern',
    shadowType: ghostPattern.shadowType,
    memeComponent: ghostPattern.memeComponent[0] ?? 0,
    fieldComponent: ghostPattern.fieldComponent[0] ?? 0,
  };
}

/**
 * Create links between nodes based on word association probability
 */
function createWordLinks(
  nodes: WordNode[],
  spiritTypes: SpiritType[],
  ghostPatterns: GhostPattern[],
  minWeight: number = 0.1
): WordLink[] {
  const links: WordLink[] = [];
  const nodeMap = new Map<string, number>();
  nodes.forEach((node, index) => {
    nodeMap.set(node.id, index);
  });

  // Create links within Spirit Types (archetypal connections)
  spiritTypes.forEach((st, i) => {
    spiritTypes.slice(i + 1).forEach((st2) => {
      // Calculate similarity based on distance to archetype
      const similarity = 1.0 / (1.0 + Math.abs(st.distanceToArchetype - st2.distanceToArchetype));
      if (similarity >= minWeight) {
        const sourceIdx = nodeMap.get(st.id);
        const targetIdx = nodeMap.get(st2.id);
        if (sourceIdx !== undefined && targetIdx !== undefined) {
          links.push({
            source: sourceIdx,
            target: targetIdx,
            weight: similarity,
            mode: 'tension',
          });
        }
      }
    });
  });

  // Create links within Ghost Patterns (problematic pattern connections)
  ghostPatterns.forEach((gp, i) => {
    ghostPatterns.slice(i + 1).forEach((gp2) => {
      // Calculate similarity based on problematic indicators
      const commonIndicators = gp.problematicIndicators.filter(
        (ind: string) => gp2.problematicIndicators.includes(ind)
      ).length;
      const similarity = commonIndicators > 0 ? commonIndicators / 3.0 : 0.1;
      if (similarity >= minWeight) {
        const sourceIdx = nodeMap.get(gp.id);
        const targetIdx = nodeMap.get(gp2.id);
        if (sourceIdx !== undefined && targetIdx !== undefined) {
          links.push({
            source: sourceIdx,
            target: targetIdx,
            weight: similarity,
            mode: 'compression', // Ghost Patterns use compression
          });
        }
      }
    });
  });

  // Create links between Spirit Types and Ghost Patterns (pattern interference)
  spiritTypes.forEach((st) => {
    ghostPatterns.forEach((gp) => {
      // Check if they share word pairs (pattern interference)
      const sharedWords = st.wordPairs.some((wp1: { stimulusWord: string; responseWord: string }) =>
        gp.wordPairs.some((wp2: { stimulusWord: string; responseWord: string }) =>
          wp1.stimulusWord === wp2.stimulusWord || wp1.responseWord === wp2.responseWord
        )
      );
      if (sharedWords) {
        const sourceIdx = nodeMap.get(st.id);
        const targetIdx = nodeMap.get(gp.id);
        if (sourceIdx !== undefined && targetIdx !== undefined) {
          links.push({
            source: sourceIdx,
            target: targetIdx,
            weight: 0.3, // Lower weight for interference
            mode: 'tension',
          });
        }
      }
    });
  });

  return links;
}

/**
 * Convert Spirit Types and Ghost Patterns to visualization data
 */
export function convertToVisualizationData(
  spiritTypes: SpiritType[],
  ghostPatterns: GhostPattern[],
  use3DProjection: boolean = false
): { nodes: WordNode[]; links: WordLink[] } {
  // Convert to nodes
  const spiritTypeNodes = spiritTypes.map((st, i) => spiritTypeToWordNode(st, i));
  const ghostPatternNodes = ghostPatterns.map((gp, i) => ghostPatternToWordNode(gp, i));
  const nodes = [...spiritTypeNodes, ...ghostPatternNodes];

  // If 3D projection is requested, project 1024d vectors to 3D
  if (use3DProjection) {
    // This will be implemented with PCA/UMAP in dimensionality-reduction.ts
    // For now, use Gene/Meme/Field components as 3D coordinates
    nodes.forEach((node) => {
      if (node.geneComponent !== undefined && node.memeComponent !== undefined && node.fieldComponent !== undefined) {
        node.initial = [
          node.geneComponent * 100,
          node.memeComponent * 100,
          node.fieldComponent * 100,
        ];
      }
    });
  }

  // Create links
  const links = createWordLinks(nodes, spiritTypes, ghostPatterns);

  return { nodes, links };
}

/**
 * Group nodes by classification type
 */
export function groupNodesByClassification(nodes: WordNode[]): {
  spiritTypes: WordNode[];
  ghostPatterns: WordNode[];
} {
  return {
    spiritTypes: nodes.filter(n => n.classificationType === 'spirit-type'),
    ghostPatterns: nodes.filter(n => n.classificationType === 'ghost-pattern'),
  };
}

