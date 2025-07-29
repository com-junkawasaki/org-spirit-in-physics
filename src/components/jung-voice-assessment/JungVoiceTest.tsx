"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useKawasakiStore } from '@/store/kawasakiStore';

interface JungVoiceTestProps {
  numberOfWords?: number;
  className?: string;
}

const INTRODUCTION_MESSAGE = "This study requires capturing your webcam and microphone for the entire duration of each session. Please grant permission when prompted. When you're ready, click the start button.";

export default function JungVoiceTest({
  numberOfWords = 10,
  className = '',
}: JungVoiceTestProps) {
  const {
    testStatus,
    currentWordIndex,
    stimulusWords,
    startSession,
    resetTest,
    logEvent,
    saveSessionVideo,
    currentSession,
    advanceToNextWord, // Assuming this action exists now
    mediaStatus,
    setMediaStatus
  } = useKawasakiStore();
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionToResume, setSessionToResume] = useState<any>(null);
  
  const stopContinuousRecording = useCallback(() => {
    // ... logic to stop recording and save file
    setIsRecording(false);
  }, [/* dependencies */]);

  const startContinuousRecording = useCallback(async () => {
    // ... logic to start recording
    setIsRecording(true);
  }, [/* dependencies */]);
  
  // This effect handles the main test loop based on zustand state
  useEffect(() => {
    if (testStatus.includes('running') && currentWordIndex < stimulusWords.length) {
      const word = stimulusWords[currentWordIndex];
      const audio = new Audio(`/audio/jung_${word.replace(/\s+/g, '-').toLowerCase()}.mp3`);
      
      const playAudio = () => {
        setMediaStatus('playing_audio');
        logEvent('word_audio_playing', { word });
        audio.play().catch(e => console.error("Audio play error:", e));
      };

      const handleAudioEnd = () => {
        setMediaStatus('recording_response');
        logEvent('response_window_opened', { word });
        responseTimerRef.current = setTimeout(() => {
          logEvent('response_window_closed', { word });
          if (currentWordIndex >= stimulusWords.length - 1) {
            useKawasakiStore.getState().completeSession();
          } else {
            advanceToNextWord();
          }
        }, 6000);
      };
      
      audio.addEventListener('ended', handleAudioEnd);
      playAudio();

      return () => {
        audio.removeEventListener('ended', handleAudioEnd);
        if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      }
    }
  }, [currentWordIndex, testStatus, stimulusWords, advanceToNextWord, logEvent, setMediaStatus]);


  const handleStartSession = async () => {
    setError(null);
    try {
      // Step 1: Get stream and set up preview
      const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: { width: 1280, height: 720 }
      });
      combinedStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      
      // Step 2: Start session recording
      await startContinuousRecording();

      // Step 3: Start the test loop in zustand
      startSession(numberOfWords);

    } catch (err) {
      setError("Failed to initialize devices. Please check permissions.");
    }
  };

  const handleResumeSession = () => {
    // if (sessionToResume) {
    //     useKawasakiStore.getState().restoreSession(sessionToResume.data, sessionToResume.session, sessionToResume.assessmentId);
    //     setSessionToResume(null); // Clear resume state
    //     // Start recording for the resumed session
    //     startContinuousRecording();
    // }
  };

  const handleEndSession = () => {
      // stopContinuousRecording();
      // useKawasakiStore.getState().completeSession();
  }
  
  const handleStartSecondSession = async () => {
      stopContinuousRecording(); // Stop session 1 recording
      await startContinuousRecording(); // Start session 2 recording
      startSession(numberOfWords); // This will correctly start session 2
  }

  // UI Components
  const IntroScreen = () => (
    <div>
        <p className="mb-6">{INTRODUCTION_MESSAGE}</p>
        <Button onClick={handleStartSession} size="lg">Start Session 1</Button>
    </div>
  );

  const SessionScreen = () => (
    <div className="space-y-4">
      <div className="relative w-40 h-32 mx-auto bg-gray-900 rounded-md overflow-hidden mb-4 flex items-center justify-center">
        <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
        <div className="absolute inset-0 flex items-center justify-center">
             <p className="text-white/50 text-xs">Camera Preview</p>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Session {currentSession} - 
        Word {currentWordIndex + 1} of {stimulusWords.length}
      </p>
      <h2 className="text-4xl font-bold my-8 h-12">{stimulusWords[currentWordIndex]}</h2>
    </div>
  );
  
  const BreakScreen = () => (
    <div className="space-y-4">
        <h2 className="text-2xl font-bold">Session 1 Complete</h2>
        <p>Take a short break. When you are ready, start the second session.</p>
        <Button onClick={handleStartSecondSession} size="lg">Start Session 2</Button>
    </div>
  );
  
  const CompletionScreen = () => {
    useEffect(() => {
        stopContinuousRecording();
    }, [stopContinuousRecording]);

    return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Test Complete</h2>
          <p>Thank you for your participation. Your data has been saved.</p>
          <Button onClick={resetTest}>Take Test Again</Button>
        </div>
      );
  };
  
  const renderContent = () => {
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