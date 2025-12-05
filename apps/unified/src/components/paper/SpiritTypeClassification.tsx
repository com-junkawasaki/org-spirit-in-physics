// Merkle DAG: components.SpiritTypeClassification
// Spirit Type classification display component

import type { SpiritType } from '../../types/paper/experimental';

interface SpiritTypeClassificationProps {
  spiritTypes: SpiritType[];
}

export default function SpiritTypeClassification({
  spiritTypes,
}: SpiritTypeClassificationProps) {
  const uniqueArchetypes = [...new Set(spiritTypes.map((st) => st.archetype))];
  const archetypeCounts = uniqueArchetypes.map((arch) => ({
    archetype: arch,
    count: spiritTypes.filter((st) => st.archetype === arch).length,
  }));

  const meanDistance =
    spiritTypes.length > 0
      ? (
          spiritTypes.reduce((sum, st) => sum + st.distanceToArchetype, 0) /
          spiritTypes.length
        ).toFixed(3)
      : 'N/A';

  return (
    <div className="my-8">
      <h3>Spirit Type Classification</h3>

      <p>
        A total of <strong>{spiritTypes.length}</strong> responses were classified as Spirit Type
        (typical patterns composed of Gene + Meme + Field).
      </p>

      <div className="my-4">
        <h4>Archetype Distribution</h4>
        <ul className="list-disc list-inside">
          {archetypeCounts.map(({ archetype, count }) => (
            <li key={archetype}>
              <strong>{archetype}</strong>: {count} responses
            </li>
          ))}
        </ul>
      </div>

      <div className="my-4">
        <h4>Component Statistics</h4>
        <p className="text-sm text-gray-600">
          Mean distance to archetype: {meanDistance}
        </p>
      </div>

      <div className="my-4">
        <p className="text-sm italic">
          <strong>Note:</strong> Spirit Type represents healthy information space structures that
          are typical, predictable, and do not produce problematic bugs.
        </p>
      </div>
    </div>
  );
}
