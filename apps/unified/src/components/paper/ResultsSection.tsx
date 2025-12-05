// Merkle DAG: components.ResultsSection
// Results section component with Spirit Type/Ghost Pattern classification display

import type { ExperimentalData } from '../../types/paper/experimental';
import DescriptiveStatistics from './DescriptiveStatistics';
import SpiritTypeClassification from './SpiritTypeClassification';
import GhostPatternDetection from './GhostPatternDetection';
import StatisticalAnalysis from './StatisticalAnalysis';

interface ResultsSectionProps {
  data: ExperimentalData;
}

export default function ResultsSection({ data }: ResultsSectionProps) {
  return (
    <section id="results" className="prose prose-lg max-w-none">
      <h2>Results</h2>

      <DescriptiveStatistics data={data} />

      <SpiritTypeClassification spiritTypes={data.spiritTypes} />

      <GhostPatternDetection ghostPatterns={data.ghostPatterns} />

      <StatisticalAnalysis classification={data.classification} />
    </section>
  );
}
