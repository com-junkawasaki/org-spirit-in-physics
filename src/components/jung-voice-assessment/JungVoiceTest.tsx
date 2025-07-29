"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useKawasakiStore } from '@/store/kawasakiStore';

interface JungVoiceTestProps {
  numberOfWords?: number;
  className?: string;
}

const INTRODUCTION_MESSAGE = "Welcome to Spirit in Physics. You will participate in two sessions. In each, I will present a series of words. For each word, please speak the first word that comes to mind. Your responses will be recorded. When you're ready, click the start button.";

export default function JungVoiceTest({
  numberOfWords = 10,
  className = '',
}: JungVoiceTestProps) {
  const {
    testStatus,
    currentWordIndex,
    stimulusWords,
    startSession,
    recordResponse,
    resetTest
  } = useKawasakiStore();
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback((path: string, onEnded?: () => void) => {
    if (audioRef.current) {
        audioRef.current.src = path;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.error(`Failed to play audio from ${path}:`, error));
        }
        if (onEnded) {
            const handleEnded = () => {
                onEnded();
                audioRef.current?.removeEventListener('ended', handleEnded);
            };
            audioRef.current.addEventListener('ended', handleEnded);
        }
    }
  }, []);
  
  const startRecording = useCallback(async () => {
    setError(null);
    setIsRecording(true);
    audioChunksRef.current = [];

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            recordResponse(audioBlob);
            setIsRecording(false);
        };

        mediaRecorderRef.current.start();

        // Stop recording after 6 seconds
        setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
        }, 6000);

    } catch (err) {
        console.error("Error starting microphone:", err);
        setError("Could not access microphone. Please check permissions.");
        setIsRecording(false);
    }
  }, [recordResponse]);


  useEffect(() => {
    if (testStatus === 'session-1-running' || testStatus === 'session-2-running') {
        if (currentWordIndex >= 0 && currentWordIndex < stimulusWords.length) {
            const word = stimulusWords[currentWordIndex];
            const filename = `jung_${word.replace(/\s+/g, '-').toLowerCase()}.mp3`;
            playAudio(`/audio/${filename}`, () => {
                startRecording();
            });
        }
    }
  }, [currentWordIndex, testStatus, stimulusWords, playAudio, startRecording]);

  const handleStartSession = () => {
    if (showIntro) {
      setShowIntro(false);
    }
    startSession(numberOfWords);
  }

  // UI Components for each status
  const IntroScreen = () => (
    <div>
        <p className="mb-6">{INTRODUCTION_MESSAGE}</p>
        <Button onClick={handleStartSession} size="lg">Start</Button>
    </div>
  );

  const SessionScreen = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Session {useKawasakiStore.getState().currentSession} - 
        Word {currentWordIndex + 1} of {stimulusWords.length}
      </p>
      <h2 className="text-4xl font-bold my-8 h-12">{stimulusWords[currentWordIndex]}</h2>
      <div>
        {isRecording ? (
          <p className="text-lg text-blue-600 animate-pulse">Recording... (6s)</p>
        ) : (
          <p className="text-lg text-gray-500">Moving to next word...</p>
        )}
      </div>
    </div>
  );
  
  const BreakScreen = () => (
    <div className="space-y-4">
        <h2 className="text-2xl font-bold">Session 1 Complete</h2>
        <p>Take a short break. When you are ready, start the second session.</p>
        <Button onClick={handleStartSession} size="lg">Start Session 2</Button>
    </div>
  );
  
  const CompletionScreen = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Test Complete</h2>
      <p>Thank you for your participation. Your data has been saved.</p>
      <Button onClick={resetTest}>Take Test Again</Button>
    </div>
  );

  const renderContent = () => {
    if (showIntro && testStatus === 'idle') {
        return <IntroScreen />;
    }

    switch (testStatus) {
        case 'session-1-running':
        case 'session-2-running':
            return <SessionScreen />;
        case 'session-1-complete':
            return <BreakScreen />;
        case 'completed':
            return <CompletionScreen />;
        case 'idle':
        default:
            return <IntroScreen />;
    }
  };

  return (
    <Card className={`text-center p-6 ${className}`}>
      <audio ref={audioRef} className="hidden" />
      <CardHeader>
        <CardTitle>Jung Voice Test</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {renderContent()}
      </CardContent>
    </Card>
  );
} 