"use client";

import React, { useState, useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useKawasakiStore } from '@/store/kawasakiStore';
import AudioVisualizer from './AudioVisualizer';
import type { JungVoiceTestProps } from './types';

const INTRODUCTION_MESSAGE = "This study requires capturing your webcam and microphone for the entire duration of each session. Please grant permission when prompted. When you're ready, click the start button.";

// --- Sub-components moved outside the main component ---

interface IntroScreenProps {
  onStart: () => void;
}
const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => (
  <div>
    <p className="mb-6">{INTRODUCTION_MESSAGE}</p>
    <Button onClick={onStart} size="lg">Start Session 1</Button>
  </div>
);

interface PreflightScreenProps {
  videoPreviewRef: MutableRefObject<HTMLVideoElement | null>;
  streamRef: MutableRefObject<MediaStream | null>;
  deviceStatus: 'idle' | 'pending' | 'success' | 'error';
  error: string | null;
  onStartSession: () => void;
  setDeviceStatus: (status: 'idle' | 'pending' | 'success' | 'error') => void;
  setError: (error: string | null) => void;
  logEvent: (event: string, details?: Record<string, any>) => void;
}
const PreflightScreen: React.FC<PreflightScreenProps> = ({
  videoPreviewRef,
  streamRef,
  deviceStatus,
  error,
  onStartSession,
  setDeviceStatus,
  setError,
  logEvent,
}) => {
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 1280, height: 720 }
        });
        streamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(e => {
            if (e.name !== 'AbortError') console.error("Video play error:", e);
          });
        }
        setDeviceStatus('success');
        logEvent('preflight_devices_acquired');
      } catch (err) {
        setDeviceStatus('error');
        setError("Failed to access camera or microphone. Please check your browser permissions.");
        logEvent('preflight_devices_failed', { error: (err as Error).message });
      }
    };
    initializeMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // This should only run once on mount

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Device Check</h2>
      <div className="relative w-full max-w-md mx-auto aspect-video bg-gray-900 rounded-md overflow-hidden mb-4 flex items-center justify-center">
        <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
        {deviceStatus !== 'success' && (
          <div className="absolute inset-0 flex items-center justify-center text-center p-4">
            <p className="text-white/80 text-lg">
              {deviceStatus === 'pending' && 'Preparing camera and microphone...'}
              {deviceStatus === 'error' && 'Could not access devices.'}
            </p>
          </div>
        )}
      </div>
      {deviceStatus === 'success' && streamRef.current && (
        <div className="space-y-3 text-center">
          <p className="text-green-500">Camera and microphone are ready.</p>
          <AudioVisualizer stream={streamRef.current} />
        </div>
      )}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <Button onClick={onStartSession} size="lg" disabled={deviceStatus !== 'success'}>
        Start Session
      </Button>
    </div>
  );
};

interface SessionScreenProps {
  videoPreviewRef: MutableRefObject<HTMLVideoElement | null>;
  streamRef: MutableRefObject<MediaStream | null>;
  currentSession: 1 | 2;
  currentWordIndex: number;
  stimulusWords: string[];
}
const SessionScreen: React.FC<SessionScreenProps> = ({ videoPreviewRef, streamRef, currentSession, currentWordIndex, stimulusWords }) => {
  useEffect(() => {
    if (videoPreviewRef.current && streamRef.current) {
      videoPreviewRef.current.srcObject = streamRef.current;
    }
  }, [streamRef, videoPreviewRef]);
  
  if (currentWordIndex >= stimulusWords.length) {
    return <div>Loading next word...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative w-40 h-32 mx-auto bg-gray-900 rounded-md overflow-hidden mb-4 flex items-center justify-center">
        <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
      </div>
      <p className="text-sm text-gray-500">
        Session {currentSession} - Word {currentWordIndex + 1} of {stimulusWords.length}
      </p>
      <h2 className="text-4xl font-bold my-8 h-12">{stimulusWords[currentWordIndex]}</h2>
    </div>
  );
};

interface BreakScreenProps {
  onStartNextSession: () => void;
}
const BreakScreen: React.FC<BreakScreenProps> = ({ onStartNextSession }) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">Session 1 Complete</h2>
    <p>Take a short break. When you are ready, start the second session.</p>
    <Button onClick={onStartNextSession} size="lg">Start Session 2</Button>
  </div>
);

interface CompletionScreenProps {
  onReset: () => void;
}
const CompletionScreen: React.FC<CompletionScreenProps> = ({ onReset }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Assessment Complete!</h2>
      <p>Thank you for your participation. Your data has been saved.</p>
      <Button onClick={onReset}>Start New Session</Button>
    </div>
  );
};


// --- Main Component ---

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
    advanceToNextWord,
    setMediaStatus,
    startPreflight,
    completeSession,
    deviceStatus,
    setDeviceStatus,
  } = useKawasakiStore();
  
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach(track => track.stop());
      combinedStreamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async (session: 1 | 2) => {
    if (!combinedStreamRef.current) {
      logEvent('recording_start_failed', { reason: 'No media stream available.' });
      setError("Cannot start recording, media stream is not available.");
      return;
    }
  
    const videoChunks: Blob[] = [];
    try {
      const recorder = new MediaRecorder(combinedStreamRef.current, { mimeType: 'video/webm; codecs=vp9' });
      mediaRecorderRef.current = recorder;
  
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) videoChunks.push(event.data);
      };
  
      recorder.onstop = () => {
        const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
        saveSessionVideo(session, videoBlob);
        logEvent('recording_stopped_and_saved', { session });
        mediaRecorderRef.current = null;
      };
  
      recorder.start();
      logEvent('recording_started', { session });
    } catch (err) {
      logEvent('media_recorder_setup_failed', { error: (err as Error).message });
      setError("Failed to create MediaRecorder.");
    }
  }, [logEvent, saveSessionVideo]);
  
  useEffect(() => {
    if (testStatus.includes('running') && currentWordIndex >= 0 && currentWordIndex < stimulusWords.length) {
      const word = stimulusWords[currentWordIndex];
      logEvent('word_displayed', { word });
      
      setMediaStatus('recording_response');
      logEvent('response_window_opened', { word });

      responseTimerRef.current = setTimeout(() => {
        logEvent('response_window_closed', { word });
        if (currentWordIndex >= stimulusWords.length - 1) {
          completeSession();
        } else {
          advanceToNextWord();
        }
      }, 6000);

      return () => {
        if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      }
    }
  }, [currentWordIndex, testStatus, stimulusWords, advanceToNextWord, logEvent, setMediaStatus, completeSession]);
  
  useEffect(() => {
    if(testStatus === 'completed'){
        stopRecording();
    }
  }, [testStatus, stopRecording]);


  const handleConfirmAndStartSession = async () => {
    setError(null);
    await startRecording(1);
    startSession(numberOfWords);
  };
  
  const handleStartSecondSession = async () => {
      stopRecording();
      await startRecording(2);
      startSession(numberOfWords);
  }

  const renderContent = () => {
    switch (testStatus) {
      case 'preflight':
        return <PreflightScreen 
          videoPreviewRef={videoPreviewRef}
          streamRef={combinedStreamRef}
          deviceStatus={deviceStatus}
          error={error}
          onStartSession={handleConfirmAndStartSession}
          setDeviceStatus={setDeviceStatus}
          setError={setError}
          logEvent={logEvent}
        />;
      case 'session-1-running':
      case 'session-2-running':
        return <SessionScreen 
          videoPreviewRef={videoPreviewRef}
          streamRef={combinedStreamRef}
          currentSession={currentSession}
          currentWordIndex={currentWordIndex}
          stimulusWords={stimulusWords}
        />;
      case 'session-1-complete':
        return <BreakScreen onStartNextSession={handleStartSecondSession} />;
      case 'completed':
        return <CompletionScreen onReset={resetTest} />;
      case 'idle':
      default:
        return <IntroScreen onStart={startPreflight} />;
    }
  };

  return (
    <Card className={`text-center p-6 ${className}`}>
      <CardHeader>
        <CardTitle>Jung Voice Test</CardTitle>
      </CardHeader>
      <CardContent>
        {error && testStatus !== 'preflight' && <p className="text-red-500 mb-4">{error}</p>}
        {renderContent()}
      </CardContent>
    </Card>
  );
} 