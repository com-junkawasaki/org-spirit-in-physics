import dynamic from 'next/dynamic';

// Dynamically import the visualizer components
const TimelineVisualization = dynamic(() => import('../components/TimelineVisualization'), {
  ssr: false,
  loading: () => <div>Loading Timeline...</div>
});

const EmotionDistanceVisualization = dynamic(() => import('../components/EmotionDistanceVisualization'), {
  ssr: false,
  loading: () => <div>Loading Emotion Distance...</div>
});

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Spirit is Physics - Visualizer
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timeline Visualization */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Timeline Analysis</h2>
            <TimelineVisualization participantId="test-participant" />
          </div>

          {/* Emotion Distance Visualization */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Emotion Distance Analysis</h2>
            <EmotionDistanceVisualization
              participantId="test-participant"
              experimentId="test-experiment"
              method="euclidean"
              embeddingMethod="pca"
              dimensions={2}
              k={10}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
