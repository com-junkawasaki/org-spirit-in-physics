"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useKawasakiStore } from '@/store/kawasakiStore';

interface JungVoiceTestProps {
  numberOfWords?: number;
  className?: string;
}

const INTRODUCTION_MESSAGE = "This study requires capturing your webcam and microphone audio. Please grant permission when prompted. A small preview of your camera will be shown. When you're ready, click the start button.";

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
    resetTest,
    logEvent,
    saveSessionVideo, // Changed from saveScreenRecording
    currentSession,
  } = useKawasakiStore();
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null); // Ref for the video preview element
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]); // Renamed from screenChunks
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
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // This will trigger onstop
    }
    combinedStreamRef.current?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
    logEvent('recording_stopped', { session: currentSession });
  }, [logEvent, currentSession]);

  const startRecording = useCallback(async (isSessionRecording: boolean) => {
    setError(null);
    setIsRecording(true);
    
    if(isSessionRecording) {
      videoChunksRef.current = [];
    } else {
      audioChunksRef.current = [];
    }
    
    logEvent('recording_started', { type: isSessionRecording ? 'webcam_and_mic' : 'mic_only', session: currentSession });

    try {
        let streamToRecord: MediaStream;
        let mimeType: string;

        if (isSessionRecording) {
            const videoStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
            });
            combinedStreamRef.current = videoStream;
            
            // Show preview
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = videoStream;
            }

            streamToRecord = videoStream;
            mimeType = 'video/webm';
        } else {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamToRecord = audioStream;
            mimeType = 'audio/webm';
        }
        
        mediaRecorderRef.current = new MediaRecorder(streamToRecord, { mimeType });

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              if (isSessionRecording) {
                videoChunksRef.current.push(event.data);
              } else {
                audioChunksRef.current.push(event.data);
              }
            }
        };

        mediaRecorderRef.current.onstop = () => {
          if (isSessionRecording) {
            const videoBlob = new Blob(videoChunksRef.current, { type: mimeType });
            // Re-using saveScreenRecording action to save the webcam video blob
            saveSessionVideo(currentSession, videoBlob); // Use the new action name
          } else {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            recordResponse(audioBlob);
          }
            setIsRecording(false);
        };

        mediaRecorderRef.current.start();

        if (!isSessionRecording) {
            setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
            }, 6000);
        }

    } catch (err) {
        console.error("Error starting recording:", err);
        setError("Could not access camera/microphone. Please check permissions.");
        setIsRecording(false);
    }
  }, [recordResponse, saveSessionVideo, currentSession, logEvent]);


  useEffect(() => {
    if ((testStatus === 'session-1-running' || testStatus === 'session-2-running')) {
        if (currentWordIndex >= 0 && currentWordIndex < stimulusWords.length) {
            const word = stimulusWords[currentWordIndex];
            const filename = `jung_${word.replace(/\s+/g, '-').toLowerCase()}.mp3`;
            logEvent('word_displayed', { session: currentSession, wordIndex: currentWordIndex, word: word });
            playAudio(`/audio/${filename}`, () => {
                startRecording(false); // Start mic-only recording for the response
            });
        }
    }
  }, [currentWordIndex, testStatus, stimulusWords, playAudio, startRecording, logEvent, currentSession]);

  const handleStartSession = async () => {
    if (showIntro) {
      await startRecording(true);
      setShowIntro(false);
    } else if (testStatus === 'session-1-complete') {
      stopRecording(); // Stop screen recording for session 1
      await startRecording(true); // Start new screen recording for session 2
    }
    startSession(numberOfWords);
  }

  const handleEndSession = () => {
      stopRecording(); // Stop screen recording
      // completeSession will be called by the last recordResponse
  }

  // UI Components for each status
  const IntroScreen = () => (
    <div>
        <p className="mb-6">{INTRODUCTION_MESSAGE}</p>
        <Button onClick={handleStartSession} size="lg">Grant Permissions and Start Session 1</Button>
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
      <div>
        {isRecording ? (
          <p className="text-lg text-blue-600 animate-pulse">Recording...</p>
        ) : (
          <p className="text-lg text-gray-500">Processing...</p>
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
      <Button onClick={() => { stopRecording(); resetTest(); setShowIntro(true); }}>Take Test Again</Button>
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