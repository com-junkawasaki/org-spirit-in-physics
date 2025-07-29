"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useKawasakiStore } from '@/store/kawasakiStore';
import { HumeClient } from 'hume';
import type { StreamSocket } from 'hume';

interface JungVoiceTestProps {
  numberOfWords?: number;
  apiKey?: string;
  className?: string;
}

const INTRODUCTION_MESSAGE = "Welcome to Spirit in Physics. I will present a series of words. For each word, please respond with the first word that comes to mind as quickly as possible. When you're ready, click the start button.";

export default function JungVoiceTest({
  numberOfWords = 10,
  apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY || '',
  className = '',
}: JungVoiceTestProps) {
  const {
    testStatus,
    currentWordIndex,
    stimulusWords,
    startTest,
    recordResponse,
    resetTest
  } = useKawasakiStore();
  
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const humeClientRef = useRef<HumeClient | null>(null);
  const socketRef = useRef<StreamSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (apiKey) {
      humeClientRef.current = new HumeClient({ apiKey });
    } else {
      setError("Hume API key is not set.");
    }
  }, [apiKey]);

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

  useEffect(() => {
    playAudio('/audio/Welcome_to_Spirit_in_e4385e4e.mp3');
  }, [playAudio]);


  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    setIsListening(false);
  }, []);

  const handleHumeResponse = useCallback((userInput: string) => {
    stopListening();
    recordResponse(userInput);
  }, [recordResponse, stopListening]);
  

  const startListening = useCallback(async () => {
    if (!humeClientRef.current || isListening) return;
    
    setError(null);
    setIsListening(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const socket = await humeClientRef.current.empathicVoice.stream.connect({
        onOpen: () => console.log('Hume WebSocket connected.'),
        onMessage: (message) => {
          if (message.type === 'user_input' && message.input.trim() !== "") {
            handleHumeResponse(message.input.trim());
          }
        },
        onError: (err) => {
          console.error('Hume WebSocket error:', err);
          setError('An error occurred with the voice recognition service.');
          stopListening();
        },
        onClose: () => {
          console.log('Hume WebSocket closed.');
          if (isListening) stopListening();
        },
      });
      socketRef.current = socket;

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current?.send(event.data);
        }
      };
      mediaRecorderRef.current.start(250);

    } catch (err) {
      console.error("Error starting microphone:", err);
      setError("Could not access microphone. Please check permissions.");
      setIsListening(false);
    }
  }, [isListening, handleHumeResponse, stopListening]);

  useEffect(() => {
    if (testStatus !== 'running' || currentWordIndex < 0) {
      if(isListening) stopListening();
      return;
    };

    const word = stimulusWords[currentWordIndex];
    const filename = `jung_${word.replace(/\s+/g, '-').toLowerCase()}.mp3`;
    
    playAudio(`/audio/${filename}`); // Audio plays automatically, but listening does not start

  }, [currentWordIndex, testStatus, stimulusWords, playAudio, stopListening]);

  const handleStartTest = () => {
    startTest(numberOfWords);
  }

  const handleResetTest = () => {
    resetTest();
  }

  return (
    <Card className={`text-center p-6 ${className}`}>
      <audio ref={audioRef} className="hidden" />
      <CardHeader>
        <CardTitle>Jung Voice Test</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        {testStatus === 'idle' && (
           <Button onClick={handleStartTest} size="lg">Start Test</Button>
        )}

        {testStatus === 'running' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Word {currentWordIndex + 1} of {stimulusWords.length}</p>
            <h2 className="text-4xl font-bold my-8 h-12">{stimulusWords[currentWordIndex]}</h2>
            <div>
              {isListening ? (
                <div className="flex flex-col items-center">
                  <p className="text-lg text-blue-600 animate-pulse">Listening...</p>
                  <Button onClick={stopListening} variant="destructive" className="mt-4">Stop Listening</Button>
                </div>
              ) : (
                <Button onClick={startListening} size="lg">
                  Respond
                </Button>
              )}
            </div>
          </div>
        )}

        {testStatus === 'completed' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Test Complete</h2>
            <p>Thank you for your participation.</p>
            <Button onClick={handleResetTest}>Take Test Again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 