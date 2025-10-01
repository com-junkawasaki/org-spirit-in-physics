"use client";

import React from 'react';
import { type TestResults } from '../jung-voice-assessment/types';

interface JungEmbeddingVisualizationProps {
  testData: TestResults[];
}

export default function JungEmbeddingVisualization({ testData }: JungEmbeddingVisualizationProps) {
  return (
    <div>
      <p>Visualization is currently disabled because it is under development.</p>
    </div>
  );
} 