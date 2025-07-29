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
  className = '',
}: {
  numberOfWords?: number;
  className?: string;
}) {
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
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const humeClientRef = useRef<HumeClient | null>(null);
  const socketRef = useRef<ChatSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/hume/token', { method: 'POST' });
        const data = await res.json();
        if (data.accessToken) {
          setAccessToken(data.accessToken);
        } else {
          setError(data.error || "Failed to fetch access token.");
        }
      } catch (e) {
        setError("Failed to connect to the server to get an access token.");
      }
    };
    fetchToken();
  }, []);
  
  useEffect(() => {
    if (accessToken) {
      console.log("Hume access token received, initializing client.");
      humeClientRef.current = new HumeClient({ accessToken });
      setError(null);
    }
  }, [accessToken]);
  
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
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
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
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
    stopListening();
    recordResponse(userInput);
  }, [recordResponse, stopListening]);
  
  const startListening = useCallback(async () => {
    if (!humeClientRef.current) {
      setError("Hume client is not initialized. Check server for token generation issues.");
      return;
    };
    if (isListening) return;
    
    setError(null);
    setIsListening(true);
    
    listeningTimeoutRef.current = setTimeout(() => {
        setError("No response from Hume after 10 seconds. Check API keys and network connection.");
        stopListening();
    }, 10000);

    try {
      console.log("Attempting to connect to Hume WebSocket...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const socket = await humeClientRef.current.empathicVoice.chat.connect({
        onOpen: () => console.log('Hume WebSocket connected.'),
        onMessage: (message) => {
          console.log('Received Hume message:', message); // Log all messages
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
      console.log("Hume WebSocket connection successful.");
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
      console.error("Error during Hume connection or microphone start:", err);
      setError("Failed to connect to voice service or access microphone.");
      setIsListening(false);
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
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