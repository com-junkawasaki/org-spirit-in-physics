// Merkle DAG: components.visualization_results
// Main visualization results component integrating all visualizations

import type { ExperimentalData } from '../../types/paper/experimental';
import SpiritType3DVisualization from './SpiritType3DVisualization';
import TimelineView from './TimelineView';
import WordDistanceView from './WordDistanceView';
import ComplexSpace3D from './ComplexSpace3D';
import WordNetworkGraph from './WordNetworkGraph';
import WordClusteringVisualization from './WordClusteringVisualization';
import InteractiveWordList from './InteractiveWordList';
import PipelineDiagram from './PipelineDiagram';

interface VisualizationResultsProps {
  data: ExperimentalData;
}

export default function VisualizationResults({ data }: VisualizationResultsProps) {
  const { spiritTypes, ghostPatterns } = data;

  return (
    <section id="visualization-results" className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4 dark:text-gray-100">Visualization Results</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The following visualizations demonstrate the data processing pipeline results, showing
          Spirit Type and Ghost Pattern classifications in multiple formats.
        </p>
      </div>

      {/* Pipeline Diagram */}
      <div className="mb-8">
        <PipelineDiagram />
      </div>

      {/* Timeline Visualization */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">Timeline Visualization</h3>
        <TimelineView data={data} width={1000} height={400} />
      </div>

      {/* Word Distance Visualization */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">
          Word Distance Visualization
        </h3>
        <WordDistanceView data={data} width={1000} height={600} topK={20} />
      </div>

      {/* 3D Force Graph Visualization */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">
          3D Force Graph Visualization
        </h3>
        <SpiritType3DVisualization data={data} width={1000} height={600} />
      </div>

      {/* Complex Space 3D Visualization */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">
          Complex Space 3D Visualization
        </h3>
        <ComplexSpace3D
          spiritTypes={spiritTypes}
          ghostPatterns={ghostPatterns}
          width={1000}
          height={600}
          projectionMethod="pca"
          showInformationSpace={true}
          showBiologicalSpace={true}
        />
      </div>

      {/* Network Graph Visualization */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">Word Network Graph</h3>
        <WordNetworkGraph
          spiritTypes={spiritTypes}
          ghostPatterns={ghostPatterns}
          width={800}
          height={600}
          minWeight={0.1}
        />
      </div>

      {/* Clustering Visualization */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">
          Word Clustering Visualization
        </h3>
        <WordClusteringVisualization
          spiritTypes={spiritTypes}
          ghostPatterns={ghostPatterns}
          width={800}
          height={600}
        />
      </div>

      {/* Interactive Word List */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">Interactive Word List</h3>
        <InteractiveWordList spiritTypes={spiritTypes} ghostPatterns={ghostPatterns} />
      </div>
    </section>
  );
}
