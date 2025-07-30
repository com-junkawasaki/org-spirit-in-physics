"use client";

import React, { useState } from "react";
import { JungVoiceAssessment } from "./jung-voice-assessment";
import { JungEmbeddingVisualization } from "../jung-visualization";
import { useKawasakiStore } from "../../store/kawasakiStore";

/**
 * An interactive component for Spirit in Physics that handles the
 * two-session Jungian word association test and the subsequent visualization of its results.
 */
export default function ResearchMethod() {
  const testStatus = useKawasakiStore((state) => state.testStatus);
  const resetTest = useKawasakiStore((state) => state.resetTest);
  const completedAssessments = useKawasakiStore((state) => state.completedAssessments);
  const [showEmbeddingVisualization, setShowEmbeddingVisualization] = useState(false);
  const [session, setSession] = useState(1);

  const handleSessionComplete = () => {
    if (session === 1) {
      setSession(2);
    }
  };

  const isSession1Complete = completedAssessments.length >= 1;
  const isSession2Complete = completedAssessments.length >= 2;

  return (
    <div className="space-y-8 my-12">
      <div className="p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg shadow-lg">
        {!isSession2Complete ? (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Session {session}</h2>
            {!isSession1Complete || session === 2 ? (
              <JungVoiceAssessment onComplete={handleSessionComplete} session={session} />
            ) : (
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4">Session 1 Complete</h3>
                <p className="text-gray-700 mb-6">
                  Thank you. Please take a short break. Click below to start the second session.
                </p>
                <button
                  onClick={() => setSession(2)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start Session 2
                </button>
              </div>
            )}
          </div>
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
                Start New Study
              </button>
            </div>
          </div>
        )}
      </div>

      {isSession2Complete && showEmbeddingVisualization && (
        <div className="mt-8 p-6 border rounded-lg">
           <h3 className="text-xl font-semibold mb-4">RAG-style Jung Embedding Analysis (Post-Batch-Processing)</h3>
          <p className="text-gray-600 mb-4">
             This visualization will show the semantic relationships and clustering patterns from your responses
             after they have been analyzed by the backend.
          </p>
           <div className="w-full h-96 bg-gray-200 flex items-center justify-center rounded-md">
             <p className="text-gray-500">Visualization will appear here once data is processed.</p>
           </div>
        </div>
      )}
    </div>
  );
} 