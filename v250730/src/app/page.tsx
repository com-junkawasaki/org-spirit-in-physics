'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ConsentForm from '@/components/jung-voice-assessment/ConsentForm';
import JungVoiceTest from '@/components/jung-voice-assessment/JungVoiceTest';
import { ParticipantSchema } from '@/components/jung-voice-assessment/schema';

type AppState = 'consent' | 'testing' | 'completed';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('consent');
  const [participantId, setParticipantId] = useState<string>('');

  useEffect(() => {
    setParticipantId(uuidv4());
  }, []);

  const handleConsent = (pId: string, signature: string) => {
    console.log(`Consent given by ${signature} for participant ${pId}`);
    
    const participantData = ParticipantSchema.parse({
      id: pId,
      createdAt: new Date(),
      // age, gender, etc. can be collected via an extended form if needed
    });

    // Save participant data
    fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataType: 'participant', data: participantData }),
    })
    .then(() => {
      setAppState('testing');
    })
    .catch(err => console.error("Failed to save participant data:", err));
  };

  const handleTestComplete = () => {
    console.log('Test completed for participant:', participantId);
    setAppState('completed');
  };

  const renderContent = () => {
    switch (appState) {
      case 'testing':
        // NOTE: JungVoiceTest will need an onComplete prop to trigger handleTestComplete
        return <JungVoiceTest onComplete={handleTestComplete} />;
      case 'completed':
        return (
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Thank you for your participation.</h1>
            <p>Your session is complete. You may now close the window.</p>
          </div>
        );
      case 'consent':
      default:
        return <ConsentForm onConsent={handleConsent} participantId={participantId} />;
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-2xl">
        {renderContent()}
      </div>
    </main>
  );
} 