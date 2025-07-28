import React from 'react';
import { JungVoiceAssessmentProps, TestResults } from './types';

export default function JungVoiceTest({
  numberOfWords,
  apiKey,
  voiceName,
  speechRecognitionLang,
  onTestComplete,
  className,
}: JungVoiceAssessmentProps) {
  return (
    <div>
      <h1>Jung Voice Test</h1>
      <p>This component is under construction.</p>
      <p>Number of words: {numberOfWords}</p>
    </div>
  );
} 