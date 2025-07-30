"use client";

import React, { useEffect, useRef, useCallback, MutableRefObject, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useKawasakiStore } from '@/store/kawasakiStore';
import AudioVisualizer from './AudioVisualizer';
import type { JungVoiceTestProps } from './types';

const INTRODUCTION_MESSAGE = "This study requires capturing your webcam and microphone for the entire duration of each session. Please grant permission when prompted. When you're ready, click the start button.";

// --- Memoized, Dumb Sub-components ---

const IntroScreen = React.memo<{ onStart: () => void; }>(({ onStart }) => (
  <div>
    <p className="mb-6">{INTRODUCTION_MESSAGE}</p>
    <Button onClick={onStart} size="lg">Start Session 1</Button>
  </div>
));
IntroScreen.displayName = 'IntroScreen';


const PreflightScreen = React.memo<{
  videoPreviewRef: MutableRefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  deviceStatus: 'idle' | 'pending' | 'success' | 'error';
  error: string | null;
  onStartSession: () => void;
}>(({ videoPreviewRef, stream, deviceStatus, error, onStartSession }) => {
  useEffect(() => {
    if (stream && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(e => {
            if (e.name !== 'AbortError') console.error("Video play error:", e);
        });
    }
  }, [stream, videoPreviewRef]);

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
      {deviceStatus === 'success' && stream && (
        <div className="space-y-3 text-center">
          <p className="text-green-500">Camera and microphone are ready.</p>
          <AudioVisualizer stream={stream} />
        </div>
      )}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <Button onClick={onStartSession} size="lg" disabled={!stream}>
        Start Session
      </Button>
    </div>
  );
});
PreflightScreen.displayName = 'PreflightScreen';


const SessionScreen = React.memo<{
  videoPreviewRef: MutableRefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  currentSession: 1 | 2;
  currentWordIndex: number;
  stimulusWords: string[];
  onResponse: (response: string, audioBlob: Blob) => void;
}>(({ videoPreviewRef, stream, currentSession, currentWordIndex, stimulusWords, onResponse }) => {
    const [recognizedText, setRecognizedText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (stream && videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
        }
    }, [stream, videoPreviewRef]);

    // Speech Synthesis and Recognition Effect
    useEffect(() => {
        if (currentWordIndex < stimulusWords.length) {
            const word = stimulusWords[currentWordIndex];
            
            // Speak the word
            const utterance = new SpeechSynthesisUtterance(word);
            speechSynthesis.speak(utterance);

            // Start listening for a response
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'ja-JP';
                recognition.interimResults = true;
                recognition.continuous = false;

                recognitionRef.current = recognition;

                recognition.onstart = () => setIsListening(true);
                recognition.onend = () => setIsListening(false);

                recognition.onresult = (event) => {
                    const transcript = Array.from(event.results)
                        .map(result => result[0])
                        .map(result => result.transcript)
                        .join('');
                    setRecognizedText(transcript);

                    if (event.results[0].isFinal) {
                        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                        onResponse(transcript, audioBlob);
                        if (recognitionRef.current) {
                            recognitionRef.current.stop();
                        }
                    }
                };

                // Media Recorder Setup
                if (stream) {
                    mediaRecorderRef.current = new MediaRecorder(stream);
                    mediaRecorderRef.current.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            audioChunksRef.current.push(event.data);
                        }
                    };
                    mediaRecorderRef.current.onstop = () => {
                        // onResponse is called when recognition is final, which should trigger stop.
                    };
                    audioChunksRef.current = [];
                    mediaRecorderRef.current.start();
                }
                
                recognition.start();
            }

            return () => {
                speechSynthesis.cancel();
                if (recognitionRef.current && isListening) {
                    recognitionRef.current.stop();
                }
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
            };
        }
    }, [currentWordIndex, stimulusWords, onResponse, isListening, stream]);
  
  if (currentWordIndex >= stimulusWords.length) {
    return <div>Loading next word...</div>;
  }

  const progress = ((currentWordIndex + 1) / stimulusWords.length) * 100;

  return (
    <div className="space-y-4 flex flex-col items-center">
      <div className="relative w-40 h-32 mx-auto bg-gray-900 rounded-md overflow-hidden mb-2 flex items-center justify-center">
        <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
      </div>
       <div className="w-full max-w-md">
          <p className="text-sm text-gray-500 mb-1">
              Session {currentSession} - Word {currentWordIndex + 1} of {stimulusWords.length}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
      </div>
      <h2 className="text-6xl font-bold my-8 h-20 flex items-center justify-center">{stimulusWords[currentWordIndex]}</h2>
      <div className="h-24 w-full max-w-md">
        {stream && <AudioVisualizer stream={stream} />}
      </div>
      <div className="h-8 text-xl text-gray-600">
        {isListening ? 'Listening...' : ''}
        {recognizedText && `Recognized: ${recognizedText}`}
      </div>
    </div>
  );
});
SessionScreen.displayName = 'SessionScreen';


const BreakScreen = React.memo<{ onStartNextSession: () => void; }>(({ onStartNextSession }) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">Session 1 Complete</h2>
    <p>Take a short break. When you are ready, start the second session.</p>
    <Button onClick={onStartNextSession} size="lg">Start Session 2</Button>
  </div>
));
BreakScreen.displayName = 'BreakScreen';

const CompletionScreen = React.memo<{ onReset: () => void; }>(({ onReset }) => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Assessment Complete!</h2>
      <p>Thank you for your participation. Your data has been saved.</p>
      <Button onClick={onReset}>Start New Session</Button>
    </div>
));
CompletionScreen.displayName = 'CompletionScreen';


// --- Main Component ---

export default function JungVoiceTest({
  numberOfWords = 10,
  className = '',
  onComplete,
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
    stream,
    error,
    setStream,
    setError,
    recordWordResponse,
  } = useKawasakiStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wordDisplayedTimeRef = useRef<number | null>(null);
  
  // onComplete callback effect
  useEffect(() => {
    if (testStatus === 'completed' && onComplete) {
      onComplete();
    }
  }, [testStatus, onComplete]);

  // Effect for media initialization and cleanup
  useEffect(() => {
    const initializeMedia = async () => {
      setError(null);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 1280, height: 720 }
        });
        setStream(mediaStream);
        setDeviceStatus('success');
        logEvent('preflight_devices_acquired');
      } catch (err) {
        setDeviceStatus('error');
        setError("Failed to access camera or microphone. Please check your browser permissions.");
        logEvent('preflight_devices_failed', { error: (err as Error).message });
      }
    };

    if (testStatus === 'preflight' && !stream) {
      initializeMedia();
    }
    
    // Cleanup stream when the test is fully completed or reset
    if ((testStatus === 'completed' || testStatus === 'idle') && stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
    }

  }, [testStatus, stream, setDeviceStatus, logEvent, setStream, setError]);


  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // onstop will handle saving
    }
  }, []);

  const startRecording = useCallback(async (session: 1 | 2) => {
    if (!stream) {
      logEvent('recording_start_failed', { reason: 'No media stream available.' });
      setError("Cannot start recording, media stream is not available.");
      return;
    }
  
    const videoChunks: Blob[] = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
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
  }, [logEvent, saveSessionVideo, stream, setError]);
  
  // Word display and advancement timer
  useEffect(() => {
    if (testStatus.includes('running') && currentWordIndex >= 0 && currentWordIndex < stimulusWords.length) {
      const word = stimulusWords[currentWordIndex];
      logEvent('word_displayed', { word });
      wordDisplayedTimeRef.current = Date.now();
      
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
  
  // Stop recording when a session or the test completes
  useEffect(() => {
    if(testStatus === 'session-1-complete' || testStatus === 'completed'){
        stopRecording();
    }
  }, [testStatus, stopRecording]);


  const handleConfirmAndStartSession = async () => {
    setError(null);
    await startRecording(1);
    startSession(numberOfWords);
  };
  
  const handleStartSecondSession = async () => {
      await startRecording(2);
      startSession(numberOfWords);
  }

  const handleResponse = (response: string, audioBlob: Blob) => {
      const reactionTimeMs = wordDisplayedTimeRef.current ? Date.now() - wordDisplayedTimeRef.current : 0;

      recordWordResponse({
          responseWord: response,
          reactionTimeMs: reactionTimeMs,
          audioBlob: audioBlob,
      });

      // The advancement logic is now in the store
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
  };

  const renderContent = () => {
    switch (testStatus) {
      case 'preflight':
        return <PreflightScreen 
          videoPreviewRef={videoPreviewRef}
          stream={stream}
          deviceStatus={deviceStatus}
          error={error}
          onStartSession={handleConfirmAndStartSession}
        />;
      case 'session-1-running':
      case 'session-2-running':
        return <SessionScreen 
          videoPreviewRef={videoPreviewRef}
          stream={stream}
          currentSession={currentSession}
          currentWordIndex={currentWordIndex}
          stimulusWords={stimulusWords}
          onResponse={handleResponse}
        />;
      case 'session-1-complete':
        return <BreakScreen onStartNextSession={handleStartSecondSession} />;
      case 'completed':
        return <CompletionScreen onReset={resetTest} />;
      case 'idle':
      default:
        return null;
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