"use client";

import React, { useState } from "react";
import { JungVoiceAssessment } from "../jung-voice-assessment";
import { JungEmbeddingVisualization } from "../jung-visualization";
import { useKawasakiStore } from "../../store/kawasakiStore";

/**
 * An interactive component for Spirit in Physics that now primarily handles
 * the display of the JungVoiceTest and the subsequent visualization of its results.
 */
export default function SpiritInPhysicsInteractive() {
  const testStatus = useKawasakiStore((state) => state.testStatus);
  const resetTest = useKawasakiStore((state) => state.resetTest);
  const completedAssessments = useKawasakiStore((state) => state.completedAssessments);
  const [showEmbeddingVisualization, setShowEmbeddingVisualization] = useState(false);

  // Note: The data structure for visualization might need to be adapted
  // once the batch processing results are available. This is a placeholder.
  // For now, we'll just show the main test component.
  const latestAssessment = completedAssessments.length > 0 ? completedAssessments[completedAssessments.length - 1] : null;

  // The main interaction is now handled by JungVoiceTest, which is rendered within JungVoiceAssessment.
  // This component will orchestrate showing the test or the results.
  return (
    <div className="space-y-8 my-12">
      <div className="p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg shadow-lg">
        {testStatus !== 'completed' ? (
          <JungVoiceAssessment />
        ) : (
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-4">Assessment Complete!</h3>
            <p className="text-gray-700 mb-6">
              Thank you for completing both sessions. Your data has been saved for analysis.
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => setShowEmbeddingVisualization(!showEmbeddingVisualization)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {showEmbeddingVisualization ? 'Hide' : 'Show'} Post-Analysis Visualization
              </button>
              <button
                onClick={resetTest}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Start New Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Placeholder for where the visualization would be shown after backend processing */}
      {testStatus === 'completed' && showEmbeddingVisualization && (
        <div className="mt-8 p-6 border rounded-lg">
           <h3 className="text-xl font-semibold mb-4">RAG-style Jung Embedding Analysis (Post-Batch-Processing)</h3>
          <p className="text-gray-600 mb-4">
             This visualization will show the semantic relationships and clustering patterns from your responses
             after they have been analyzed by the backend.
          </p>
           {/* 
          <JungEmbeddingVisualization 
              // This would take the processed data from the backend, not the raw recorded blobs.
              // testData={processedDataFromBackend} 
            /> 
           */}
           <div className="w-full h-96 bg-gray-200 flex items-center justify-center rounded-md">
             <p className="text-gray-500">Visualization will appear here once data is processed.</p>
           </div>
        </div>
      )}
    </div>
  );
} 