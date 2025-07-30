"use client";

import { useState, useEffect } from 'react';
import JungVoiceTest from './JungVoiceTest';
import { JungVoiceAssessmentProps, TestResults } from './types';
import { JungVoiceAssessmentPropsSchema } from './schema';
import { v4 as uuidv4 } from 'uuid';
import { useKawasakiStore } from '@/store/kawasakiStore';

export default function JungVoiceAssessment({ 
  apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY || '',
  onTestComplete,
  onComplete, // new prop
  session, // new prop
  className = '',
  numberOfWords = 100, // Updated to 100 as per research plan
}: JungVoiceAssessmentProps) {
  // Props validation
  const validatedProps = JungVoiceAssessmentPropsSchema.parse({
    numberOfWords: numberOfWords,
    apiKey,
    generationId: 'default', // Default value
    voiceName: 'default', // Default value
    speechRecognitionLang: 'en-US', // Default value
    onTestComplete,
    onComplete,
    session,
    className
  });

  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [userId, setUserId] = useState<string>('');

  const addCompletedAssessment = useKawasakiStore(state => state.addCompletedAssessment);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingUserId = localStorage.getItem('jung_test_user_id');
      const newUserId = existingUserId || uuidv4();
      
      if (!existingUserId) {
        localStorage.setItem('jung_test_user_id', newUserId);
      }
      
      setUserId(newUserId);
    }
  }, []);

  const handleTestComplete = (results: TestResults) => {
    setTestResults(results);
    
    // Pass session number to the store
    addCompletedAssessment({ ...results, session: validatedProps.session });
    
    if (onTestComplete) {
      onTestComplete(results);
    }

    if (validatedProps.onComplete) {
      validatedProps.onComplete();
    }
  };

  return (
    <div className={`px-4 sm:px-6 md:px-8 pt-4 pb-6 ${className}`}>
        <div className="max-w-4xl mx-auto space-y-6">
          <JungVoiceTest 
            apiKey={validatedProps.apiKey}
            onTestComplete={handleTestComplete}
            numberOfWords={validatedProps.numberOfWords}
          />
        </div>
    </div>
  );
} 