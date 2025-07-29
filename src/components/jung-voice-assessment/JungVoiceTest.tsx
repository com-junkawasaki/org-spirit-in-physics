"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useKawasakiStore } from '@/store/kawasakiStore';
import AudioVisualizer from './AudioVisualizer';

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
    advanceToNextWord,
    mediaStatus,
    setMediaStatus,
    startPreflight,
    completeSession,
    deviceStatus,
    setDeviceStatus,
  } = useKawasakiStore();
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionToResume, setSessionToResume] = useState<any>(null);
  
  const stopContinuousRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // This will trigger the onstop event
    }
  }, []);

  const startContinuousRecording = useCallback(async () => {
    if (combinedStreamRef.current) {
      videoChunksRef.current = []; // Clear previous chunks
      const recorder = new MediaRecorder(combinedStreamRef.current, {
        mimeType: 'video/webm; codecs=vp9',
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        // Use the store action to save the video
        useKawasakiStore.getState().saveSessionVideo(currentSession, videoBlob);
        videoChunksRef.current = []; // Clear chunks after saving
        setIsRecording(false);
        logEvent('continuous_recording_stopped', { session: currentSession });
      };

      recorder.start(5000); // Save chunks every 5 seconds
      setIsRecording(true);
      logEvent('continuous_recording_started', { session: currentSession });
    }
  }, [currentSession, logEvent]);
  
  // This effect handles the main test loop based on zustand state
  useEffect(() => {
    if (testStatus.includes('running') && currentWordIndex < stimulusWords.length) {
      const word = stimulusWords[currentWordIndex];
      logEvent('word_displayed', { word });
      
      // Immediately start the response timer as audio is no longer played
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

      return () => {
        if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      }
    }
  }, [currentWordIndex, testStatus, stimulusWords, advanceToNextWord, logEvent, setMediaStatus]);


  const handleConfirmAndStartSession = async () => {
    setError(null);
    try {
      // Stream is already acquired during preflight, so we can just start recording
      await startContinuousRecording();
      // Start the test loop in zustand
      startSession(numberOfWords);
    } catch (err) {
      setError("Failed to start the session.");
      logEvent('session_start_failed', { error: (err as Error).message });
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
      stopContinuousRecording();
      useKawasakiStore.getState().completeSession();
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
        <Button onClick={startPreflight} size="lg">Start Session 1</Button>
    </div>
  );

  const PreflightScreen = () => {
    useEffect(() => {
      const initializeMedia = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: true, 
              video: { width: 1280, height: 720 }
          });
          combinedStreamRef.current = stream;
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
            videoPreviewRef.current.play().catch(e => {
              if (e.name !== 'AbortError') {
                console.error("Video play error:", e);
              }
            });
          }
          setDeviceStatus('success');
          logEvent('preflight_devices_acquired');
        } catch (err) {
          setDeviceStatus('error');
          setError("Failed to access camera or microphone. Please check your browser permissions and ensure no other application is using the camera.");
          logEvent('preflight_devices_failed', { error: (err as Error).message });
        }
      };
      initializeMedia();

      return () => {
        if (combinedStreamRef.current) {
          combinedStreamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }, []);

    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Device Check</h2>
        <div className="relative w-full max-w-md mx-auto aspect-video bg-gray-900 rounded-md overflow-hidden mb-4 flex items-center justify-center">
          <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
          {deviceStatus !== 'success' && (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4">
              <p className="text-white/80 text-lg">
                {deviceStatus === 'pending' && (
                  <>
                    Preparing camera and microphone...
                    <span className="block text-sm mt-2 font-normal">
                      Please allow access in your browser's pop-up.
                    </span>
                  </>
                )}
                {deviceStatus === 'error' && 'Could not access devices.'}
              </p>
            </div>
          )}
        </div>
        
        {deviceStatus === 'success' && (
          <div className="space-y-3 text-center">
            <p className="text-green-500">Camera and microphone are ready.</p>
            <div className='flex items-center justify-center gap-2'>
              <span className='text-sm font-medium text-gray-600'>Mic:</span>
              <AudioVisualizer stream={combinedStreamRef.current} />
            </div>
          </div>
        )}

        {error && <p className="text-red-500 mb-4">{error}</p>}
        <Button onClick={handleConfirmAndStartSession} size="lg" disabled={deviceStatus !== 'success'}>
          Start Session
        </Button>
      </div>
    );
  };

  const SessionScreen = () => {
    useEffect(() => {
      if (videoPreviewRef.current && combinedStreamRef.current) {
        videoPreviewRef.current.srcObject = combinedStreamRef.current;
      }
    }, []);

    return (
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
  };
  
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
          <h2 className="text-2xl font-bold">Assessment Complete!</h2>
          <p>Thank you for your participation. Your data has been saved.</p>
          <Button onClick={resetTest}>Start New Session</Button>
        </div>
      );
  };
  
  const renderContent = () => {
    switch (testStatus) {
        case 'preflight':
            return <PreflightScreen />;
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