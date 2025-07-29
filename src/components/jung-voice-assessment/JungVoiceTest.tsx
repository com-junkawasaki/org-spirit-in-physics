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
    clearVideoChunks,
    saveSessionVideo,
    currentSession,
    assessmentId,
    videoChunks,
  } = useKawasakiStore();
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToResume, setSessionToResume] = useState<any>(null);
  const [deviceCheckStatus, setDeviceCheckStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useCallback((node: HTMLVideoElement | null) => {
    if (node !== null && combinedStreamRef.current) {
      console.log("[Preview] Attaching stream to video element.");
      node.srcObject = combinedStreamRef.current;
    }
  }, []);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const snapshotTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);
  
  useEffect(() => {
    setSpeechSynthesisSupported('speechSynthesis' in window);
  }, []);

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!speechSynthesisSupported) {
      console.warn("SpeechSynthesis not supported, skipping audio.");
      onEnd?.();
      return;
    }
    // Cancel any previous utterances
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    if (onEnd) {
      utterance.onend = () => onEnd();
    }
    window.speechSynthesis.speak(utterance);
  }, [speechSynthesisSupported]);
  
  const saveSnapshot = useCallback(() => {
    const chunks = videoChunks[currentSession === 1 ? 'session1' : 'session2'];
    if (chunks.length === 0 || !assessmentId) return;

    const videoBlob = new Blob(chunks, { type: 'video/webm' });
    const fileName = `session-${currentSession}-video.webm`;
    
    logEvent('video_snapshot_saved', { session: currentSession, fileName, size: videoBlob.size, chunkCount: chunks.length });

    const formData = new FormData();
    formData.append('file', videoBlob);
    formData.append('sessionId', assessmentId);
    formData.append('fileName', fileName);

    fetch('/api/save-artifact', {
        method: 'POST',
        body: formData,
        keepalive: true, // Ensures the request is sent even if the page is closing
    }).catch(error => console.error('Failed to save video snapshot:', error));

  }, [videoChunks, currentSession, assessmentId, logEvent]);

  
  const stopContinuousRecording = useCallback(() => {
    if (snapshotTimerRef.current) {
        clearInterval(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // onstop will trigger the final save
    }
    combinedStreamRef.current?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  }, []);

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

        console.log('[Recording] Stream obtained.', stream);
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        console.log(`[Recording] Tracks found: ${videoTracks.length} video, ${audioTracks.length} audio.`);
        
        if (videoTracks.length === 0) {
            setError("No video track found. Is the camera blocked, disabled, or used by another application?");
            setIsRecording(false);
            return;
        }

        combinedStreamRef.current = stream;
        
        // The callback ref will handle attaching the stream to the preview element
        
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9,opus' });

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              addVideoChunk(currentSession, event.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
          logEvent('final_video_saving', { session: currentSession });
          saveSnapshot(); // Save the final complete video
          clearVideoChunks(currentSession);
        };

        mediaRecorderRef.current.start(1000); // Generate a chunk every second

        // Start snapshot timer
        snapshotTimerRef.current = setInterval(saveSnapshot, 10000); // Save a snapshot every 10 seconds

    } catch (err) {
        console.error("Error starting recording:", err);
        setError("Could not access camera/microphone. Please check permissions.");
        setIsRecording(false);
    }
  }, [addVideoChunk, saveSnapshot, currentSession, logEvent, clearVideoChunks]);

  const advanceToNextWord = useCallback(() => {
    useKawasakiStore.setState(state => ({
        currentWordIndex: state.currentWordIndex + 1
    }));
  }, []);

  const handleDeviceCheck = useCallback(async () => {
    setDeviceCheckStatus('checking');
    setError(null);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };

        recorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop()); // Clean up the stream
            if (chunks.length > 0) {
                const blob = new Blob(chunks, { type: 'video/webm' });
                console.log(`[Device Check] Success. Blob size: ${blob.size}`);
                setDeviceCheckStatus('success');
            } else {
                console.error('[Device Check] Failed. No data was recorded.');
                setError('Failed to record any data from camera/microphone. Please check device connections and browser permissions.');
                setDeviceCheckStatus('failed');
            }
        };
        
        recorder.start();
        setTimeout(() => {
            if (recorder.state === "recording") {
                recorder.stop();
            }
        }, 2000); // 2 second test recording

    } catch (err) {
        console.error("Error during device check:", err);
        let message = "Could not access camera/microphone. Please check browser permissions.";
        if (err instanceof Error) {
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                message = "No camera/microphone found. Please ensure they are connected and enabled.";
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                message = "Permission for camera/microphone was denied. Please allow access in your browser settings.";
            }
        }
        setError(message);
        setDeviceCheckStatus('failed');
    }
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
            speakText(word, () => {
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
  }, [currentWordIndex, testStatus, stimulusWords, speakText, advanceToNextWord, logEvent, currentSession]);

  const handleStartSession = async (session: 1 | 2) => {
    // This now assumes device check was successful
    await startContinuousRecording();
    startSession(numberOfWords);
  }

  const handleResumeSession = () => {
    if (sessionToResume) {
        useKawasakiStore.getState().restoreSession(sessionToResume.data, sessionToResume.session, sessionToResume.assessmentId);
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
        <p className="mb-6">{INTRODUCTION_MESSAGE}</p>
        
        {deviceCheckStatus === 'idle' && (
            <Button onClick={handleDeviceCheck} size="lg">Check Devices</Button>
        )}

        {deviceCheckStatus === 'checking' && (
            <p className="text-lg text-blue-600 animate-pulse">Checking devices...</p>
        )}

        {deviceCheckStatus === 'failed' && (
            <div className="p-4 border-red-400 bg-red-50 rounded-md">
                <p className="font-bold text-red-800">Device Check Failed</p>
                <p className="text-red-700">{error}</p>
                <Button onClick={handleDeviceCheck} size="lg" variant="outline" className="mt-4">Try Again</Button>
            </div>
        )}
        
        {deviceCheckStatus === 'success' && (
            <div className='flex flex-col items-center'>
                <p className="text-green-600 mb-4">✓ Devices are working correctly!</p>
                <Button onClick={() => handleStartSession(1)} size="lg">Start Session 1</Button>
            </div>
        )}
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
    // The intro screen now handles the device check flow
    if (testStatus === 'idle') {
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
      {/* <audio ref={audioRef} className="hidden" /> No longer needed */}
      <CardHeader>
        <CardTitle>Jung Voice Test</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {!speechSynthesisSupported && testStatus === 'idle' && (
            <div className="p-4 border-yellow-400 bg-yellow-50 rounded-md">
                <p className="font-bold text-yellow-800">Browser Warning</p>
                <p className="text-yellow-700">Your browser does not support speech synthesis. Audio cues will be disabled.</p>
            </div>
        )}
        {renderContent()}
      </CardContent>
    </Card>
  );
} 