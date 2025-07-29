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
  className = '',
  numberOfWords = 10,
}: JungVoiceAssessmentProps) {
  // Props validation
  const validatedProps = JungVoiceAssessmentPropsSchema.parse({
    numberOfWords: numberOfWords,
    apiKey,
    generationId: 'default', // Default value
    voiceName: 'default', // Default value
    speechRecognitionLang: 'en-US', // Default value
    onTestComplete,
    className
  });

  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [userId, setUserId] = useState<string>('');

  // Kawasaki Model ストアから更新関数を取得
  const updateVoiceAssessment = useKawasakiStore(state => state.updateVoiceAssessment);

  // ユーザーIDの初期化 - useEffect で実行してSSRに対応
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      // ユーザーIDをローカルストレージから取得または生成
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
    
    // Kawasaki Model ストアに結果を反映
    try {
      updateVoiceAssessment(results);
    } catch (error) {
      console.error('Failed to update Kawasaki Model with voice assessment results:', error);
    }
    
    if (onTestComplete) {
      onTestComplete(results);
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