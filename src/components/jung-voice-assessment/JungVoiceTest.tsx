import React from 'react';
import VoiceEmotionAnalysisWebSocket from '@/components/spirit-in-physics/VoiceEmotionAnalysisWebSocket';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function JungVoiceTest({
  apiKey,
  onTestComplete,
  numberOfWords,
}: {
  apiKey?: string;
  onTestComplete?: (results: any) => void;
  numberOfWords?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jung Voice Test</CardTitle>
        <CardDescription>
          Respond to the stimulus words by speaking into your microphone.
          Your vocal prosody will be analyzed for emotional content in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VoiceEmotionAnalysisWebSocket 
          apiKey={apiKey} 
          onTestComplete={onTestComplete}
          numberOfWords={numberOfWords}
        />
      </CardContent>
    </Card>
  );
} 