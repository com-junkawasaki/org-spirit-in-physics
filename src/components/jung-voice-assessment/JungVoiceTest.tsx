"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useKawasakiStore } from '@/store/kawasakiStore';
import { HumeClient, convertBlobToBase64 } from 'hume';
import type { ChatSocket } from 'hume';

interface JungVoiceTestProps {
  numberOfWords?: number;
  apiKey?: string;
  secretKey?: string;
  className?: string;
}

const INTRODUCTION_MESSAGE = "Welcome to Spirit in Physics. I will present a series of words. For each word, please respond with the first word that comes to mind as quickly as possible. When you're ready, click the start button.";

export default function JungVoiceTest({
  numberOfWords = 10,
  apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY || '',
  secretKey = process.env.NEXT_PUBLIC_HUME_CLIENT_SECRET || '',
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
  const socketRef = useRef<ChatSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (apiKey && secretKey) {
      humeClientRef.current = new HumeClient({ apiKey, secretKey });
    } else {
      setError("Hume API key or secret key is not set.");
    }
  }, [apiKey, secretKey]);
  
  // Play intro message on component mount
  useEffect(() => {
      const audio = new Audio('/audio/Welcome_to_Spirit_in_e4385e4e.mp3');
      audio.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.error("Error playing intro audio:", e)
        }
      });
      return () => {
          audio.pause();
          audio.src = '';
      };
  }, []);


  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    // Use property access for readyState
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
      
      const socket = await humeClientRef.current.empathicVoice.chat.connect({
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
      mediaRecorderRef.current.ondataavailable = async (event) => {
        // Use property access for readyState and sendAudioInput method
        if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
            const encodedAudio = await convertBlobToBase64(event.data);
            socketRef.current?.sendAudioInput({ data: encodedAudio });
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
    
    const audio = new Audio(`/audio/${filename}`);
    audio.play().catch(e => {
        if (e.name !== 'AbortError') {
            console.error(`Could not play audio for "${word}":`, e);
        }
    });

    return () => {
      audio.pause();
      audio.src = '';
    };

  }, [currentWordIndex, testStatus, stimulusWords, isListening, stopListening]);

  const handleStartTest = () => {
    startTest(numberOfWords);
  }

  const handleResetTest = () => {
    resetTest();
  }

  return (
    <Card className={`text-center p-6 ${className}`}>
      {/* <audio ref={audioRef} className="hidden" /> No longer needed */}
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