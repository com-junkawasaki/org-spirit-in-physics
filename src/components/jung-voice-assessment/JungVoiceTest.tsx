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
    recordResponse, // Will be deprecated in this component, but kept for store compatibility
    resetTest,
    logEvent,
    addVideoChunk,
    saveFullVideo,
    currentSession,
    restoreSession,
  } = useKawasakiStore();
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToResume, setSessionToResume] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const snapshotTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  
  const stopContinuousRecording = useCallback(() => {
    if (snapshotTimerRef.current) {
        clearInterval(snapshotTimerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // onstop will trigger the final saveFullVideo
    }
    combinedStreamRef.current?.getTracks().forEach(track => track.stop());
    logEvent('continuous_recording_stopped', { session: currentSession });
  }, [logEvent, currentSession]);

  const startContinuousRecording = useCallback(async () => {
    setError(null);
    setIsRecording(true);
    videoChunksRef.current = [];
    
    logEvent('continuous_recording_started', { session: currentSession });

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        combinedStreamRef.current = stream;
        
        if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
        }
        
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9,opus' });

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              addVideoChunk(currentSession, event.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
          logEvent('final_video_saving', { session: currentSession });
          saveFullVideo(currentSession); // Save the final complete video
        };

        mediaRecorderRef.current.start();

        // Start snapshot timer
        snapshotTimerRef.current = setInterval(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
                // This doesn't create a snapshot but saves what's been collected so far
                saveFullVideo(currentSession);
            }
        }, 10000); // Save a snapshot every 10 seconds

    } catch (err) {
        console.error("Error starting recording:", err);
        setError("Could not access camera/microphone. Please check permissions.");
        setIsRecording(false);
    }
  }, [addVideoChunk, saveFullVideo, currentSession, logEvent]);

  const advanceToNextWord = useCallback(() => {
    useKawasakiStore.setState(state => ({
        currentWordIndex: state.currentWordIndex + 1
    }));
  }, []);

  // Check for resumable session on mount
  useEffect(() => {
    const checkForResumableSession = async () => {
        try {
            const res = await fetch('/api/session');
            const data = await res.json();
            if (data.resume) {
                setSessionToResume(data);
            }
        } catch (e) {
            console.error("Failed to check for resumable session", e);
        }
    };
    checkForResumableSession();
  }, []);

  useEffect(() => {
    if (responseTimerRef.current) {
        clearTimeout(responseTimerRef.current);
    }
    if ((testStatus === 'session-1-running' || testStatus === 'session-2-running')) {
        if (currentWordIndex >= 0 && currentWordIndex < stimulusWords.length) {
            const word = stimulusWords[currentWordIndex];
            logEvent('word_displayed', { session: currentSession, wordIndex: currentWordIndex, word: word });
            const filename = `jung_${word.replace(/\s+/g, '-').toLowerCase()}.mp3`;
            playAudio(`/audio/${filename}`, () => {
                logEvent('response_window_opened', { session: currentSession, wordIndex: currentWordIndex });
                responseTimerRef.current = setTimeout(() => {
                    logEvent('response_window_closed', { session: currentSession, wordIndex: currentWordIndex });
                    // Check if this is the last word
                    if (currentWordIndex >= stimulusWords.length - 1) {
                        useKawasakiStore.getState().completeSession();
                    } else {
                        advanceToNextWord();
                    }
                }, 6000);
            });
        }
    }
    // Cleanup timer on unmount or state change
    return () => {
        if (responseTimerRef.current) {
            clearTimeout(responseTimerRef.current);
        }
    };
  }, [currentWordIndex, testStatus, stimulusWords, playAudio, advanceToNextWord, logEvent, currentSession]);

  const handleStartSession = async (session: 1 | 2) => {
    if (session === 1) {
        await startContinuousRecording();
    }
    startSession(numberOfWords);
  }

  const handleResumeSession = () => {
    if (sessionToResume) {
        restoreSession(sessionToResume.data, sessionToResume.session, sessionToResume.assessmentId);
        setSessionToResume(null); // Clear resume state
        // Start recording for the resumed session
        startContinuousRecording();
    }
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
        {sessionToResume ? (
            <div className="p-4 border-yellow-400 bg-yellow-50 rounded-md mb-6">
                <h3 className="font-bold text-yellow-800">Incomplete Session Found</h3>
                <p className="text-yellow-700">
                    An incomplete session (Session {sessionToResume.session}) was found. Do you want to resume from where you left off?
                </p>
                <div className="mt-4 space-x-4">
                    <Button onClick={handleResumeSession} size="lg">Resume Session</Button>
                    <Button onClick={() => { setSessionToResume(null); resetTest(); }} size="lg" variant="outline">Start New Test</Button>
                </div>
            </div>
        ) : (
            <>
                <p className="mb-6">{INTRODUCTION_MESSAGE}</p>
                <Button onClick={() => handleStartSession(1)} size="lg">Grant Permissions & Start Session 1</Button>
            </>
        )}
    </div>
  );

  const SessionScreen = () => (
    <div className="space-y-4">
      <div className="relative w-40 h-32 mx-auto bg-gray-900 rounded-md overflow-hidden mb-4">
        <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
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