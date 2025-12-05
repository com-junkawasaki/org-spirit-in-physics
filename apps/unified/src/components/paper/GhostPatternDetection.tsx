// Merkle DAG: components.GhostPatternDetection
// Ghost Pattern detection display component

import type { GhostPattern } from '../../types/paper/experimental';

interface GhostPatternDetectionProps {
  ghostPatterns: GhostPattern[];
}

export default function GhostPatternDetection({
  ghostPatterns,
}: GhostPatternDetectionProps) {
  const individualShadowCount = ghostPatterns.filter(
    (gp) => gp.shadowType === 'individual'
  ).length;
  const collectiveMemeCount = ghostPatterns.filter(
    (gp) => gp.shadowType === 'collective'
  ).length;

  const problematicIndicators = ghostPatterns.flatMap((gp) => gp.problematicIndicators);
  const indicatorCounts = problematicIndicators.reduce(
    (acc, indicator) => {
      acc[indicator] = (acc[indicator] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const meanDistance =
    ghostPatterns.length > 0
      ? (
          ghostPatterns.reduce((sum, gp) => sum + gp.distanceToHiddenPattern, 0) /
          ghostPatterns.length
        ).toFixed(3)
      : 'N/A';

  return (
    <div className="my-8">
      <h3>Ghost Pattern Detection</h3>

      <p>
        A total of <strong>{ghostPatterns.length}</strong> responses were classified as Ghost
        Pattern (hidden patterns primarily composed of Meme + Field).
      </p>

      <div className="my-4">
        <h4>Shadow Type Distribution</h4>
        <ul className="list-disc list-inside">
          <li>
            <strong>Individual Shadow</strong>: {individualShadowCount} responses (suppressed
            Ghost Patterns in individual information space)
          </li>
          <li>
            <strong>Collective Unconscious Meme</strong>: {collectiveMemeCount} responses (memes
            existing in collective unconscious information space)
          </li>
        </ul>
      </div>

      <div className="my-4">
        <h4>Problematic Indicators</h4>
        <ul className="list-disc list-inside">
          {Object.entries(indicatorCounts).map(([indicator, count]) => (
            <li key={indicator}>
              <strong>{indicator}</strong>: {count} occurrences
            </li>
          ))}
        </ul>
      </div>

      <div className="my-4">
        <h4>Component Statistics</h4>
        <p className="text-sm text-gray-600">
          Mean distance to hidden pattern: {meanDistance}
        </p>
      </div>

      <div className="my-4">
        <p className="text-sm italic">
          <strong>Note:</strong> Ghost Pattern represents hidden information space through
          cultural, environmental, and contextual patterns. These patterns often produce
          problematic bugs (pattern interference, cognitive bias, cultural constraints).
        </p>
      </div>
    </div>
  );
}
