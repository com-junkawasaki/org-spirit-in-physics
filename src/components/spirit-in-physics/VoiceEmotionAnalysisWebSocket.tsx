'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Clock, Mic, MicOff, ChevronRight, CheckCircle } from 'lucide-react';
import { JUNG_STIMULUS_WORDS } from '../jung-word-assessment/JungWordTest';
// import { HumeRealtimeEmotionService, ConnectionState } from '@/lib/client/hume-realtime';
// import { HumeVoiceEmotion } from '@/lib/actions/hume-service';

interface VoiceEmotionAnalysisWebSocketProps {
  apiKey?: string;
  onTestComplete?: (results: any) => void;
  numberOfWords?: number;
}

export default function VoiceEmotionAnalysisWebSocket({ 
  apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY || '',
  onTestComplete,
  numberOfWords = 10,
}: VoiceEmotionAnalysisWebSocketProps) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [emotions, setEmotions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('CLOSED');
  
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const humeServiceRef = useRef<any | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playedAudioForIndex = useRef<number>(-1);

  const stimulusWords = useMemo(() => 
    JUNG_STIMULUS_WORDS.slice(0, numberOfWords),
    [numberOfWords]
  );
  
  // Play audio for the current word when it changes
  useEffect(() => {
    if (!isRecording || isTestComplete || currentWordIndex < 0 || playedAudioForIndex.current === currentWordIndex) {
      return;
    }

    const word = stimulusWords[currentWordIndex];
    // Sanitize word for use in a filename, e.g., "head" -> "jung_head.mp3", "to sing" -> "jung_to-sing.mp3"
    const filename = 'jung_' + word.replace(/\s+/g, '-').toLowerCase() + '.mp3';
    const audio = new Audio(`/audio/${filename}`);
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playedAudioForIndex.current = currentWordIndex;
      playPromise.catch(error => {
        console.error(`Could not play audio for "${word}" (path: /audio/${filename}):`, error);
        playedAudioForIndex.current = -1; // Reset if play failed to allow retry
        // Don't show a blocking error, just log it, as audio might be optional.
        // setError(`Audio file for "${word}" could not be played. Please ensure it exists in /public/audio/`);
      });
    }
  }, [currentWordIndex, stimulusWords, isTestComplete, isRecording]);


  // エモーションサービスの初期化 (省略)
  useEffect(() => {
    if (!apiKey) {
      setError('APIキーが設定されていません。環境変数を確認してください。');
      return;
    }
    
    // Initialize Hume service
    if (apiKey && !humeServiceRef.current) {
      // humeServiceRef.current = new HumeRealtimeEmotionService(
      //   apiKey,
      //   // Face data handler (not used)
      //   () => {},
      //   // Voice data handler
      //   (data: HumeVoiceResponse) => {
      //     if (data.emotions) {
      //       setEmotions(data.emotions.sort((a, b) => b.score - a.score));
      //     }
      //   },
      //   // Error handler
      //   (err: Error | Event) => {
      //     const errorMessage = err instanceof Error ? err.message : 'WebSocket error';
      //     console.error('Hume service error:', errorMessage);
      //     setError(errorMessage);
      //     setIsConnected(false);
      //     setConnectionStatus('ERROR');
      //   }
      // );

      // Periodically check connection state
      // setInterval(() => {
      //   if (humeServiceRef.current) {
      //     const state = humeServiceRef.current.getConnectionState();
      //     setConnectionStatus(state);
      //     setIsConnected(humeServiceRef.current.isAuthenticated());
      //   }
      // }, 1000);
    }
    
    return () => {
      stopRecording();
      if (humeServiceRef.current) {
        humeServiceRef.current.closeConnection();
      }
    };
  }, [apiKey]);
  
  // 接続状態の監視
  useEffect(() => {
    if (!humeServiceRef.current) return;
    
    const intervalId = setInterval(() => {
      if (humeServiceRef.current) {
        const state = humeServiceRef.current.getConnectionState();
        setConnectionStatus(state);
        setIsConnected(humeServiceRef.current.isAuthenticated());
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // 録音開始
  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      
      // WebSocketが接続されていない場合は接続
      if (!isConnected && humeServiceRef.current) {
        try {
          await humeServiceRef.current.initWebSocket(['prosody']);
          // 接続が成功するまで少し待機
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error('Failed to initialize WebSocket:', err);
          throw new Error('WebSocketの初期化に失敗しました');
        }
      }
      
      // マイクへのアクセス要求
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // MediaRecorderの設定
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

      if (!supportedMimeType) {
        throw new Error("このブラウザでは、録音に利用できる音声フォーマットが見つかりませんでした。");
      }

      const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = recorder;
      
      // データの処理
      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // 取得したオーディオチャンクを処理
          const audioBlob = new Blob([event.data], { type: 'audio/webm' });
          
          if (humeServiceRef.current && humeServiceRef.current.isAuthenticated()) {
            try {
              await humeServiceRef.current.sendAudioData(audioBlob);
            } catch (err) {
              console.error('Failed to send audio data:', err);
            }
          }
        }
      };
      
      // 録音開始（2秒ごとにデータを取得）
      recorder.start(2000);
      
      setStartTime(Date.now());
      
    } catch (err) {
      console.error('Error starting recording:', err);
      let message = '録音の開始に失敗しました。';
      if (err instanceof Error) {
        message = `マイクエラー: ${err.name} - ${err.message}。ブラウザの権限設定を確認してください。`;
      }
      setError(message);
    }
  };
  
  // 録音停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // トラックの停止
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setIsRecording(false);
      
    }
  };
  
  const handleNextWord = () => {
    stopRecording();
    const reactionTime = startTime ? Date.now() - startTime : 0;
    const newResponse = {
      stimulusWord: stimulusWords[currentWordIndex],
      reactionTimeMs: reactionTime,
      emotions: [...emotions],
      // TODO: responseWord を音声認識で取得する
      responseWord: "spoken_word_placeholder",
    };
    const updatedResponses = [...responses, newResponse];
    setResponses(updatedResponses);
    setEmotions([]);
    
    if (currentWordIndex < stimulusWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      setIsTestComplete(true);
      const testResults = {
        responses: updatedResponses,
        averageReactionTimeMs: updatedResponses.reduce((acc, r) => acc + r.reactionTimeMs, 0) / stimulusWords.length,
        delayedResponseCount: updatedResponses.filter(r => r.reactionTimeMs > 2000).length,
      };
      if (onTestComplete) {
        onTestComplete(testResults);
      }
    }
  };

  if (isTestComplete) {
    return (
      <Card className="text-center p-8">
        <CardHeader>
          <CardTitle className="text-2xl">Test Complete</CardTitle>
          <CardDescription>Thank you for your participation.</CardDescription>
        </CardHeader>
        <CardContent>
          <CheckCircle className="w-20 h-20 mx-auto text-green-500" />
          <p className="mt-6 text-lg">Your responses have been recorded.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Word {currentWordIndex + 1} of {stimulusWords.length}</span>
            <span className={`text-sm px-2 py-1 rounded-full ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : connectionStatus === 'CONNECTING' 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {connectionStatus}
            </span>
          </CardTitle>
          <Progress value={((currentWordIndex + 1) / stimulusWords.length) * 100} className="mt-4" />
        </CardHeader>
        <CardContent className="text-center p-8">
            {error && (
              <div className="mb-6 p-3 bg-red-100 text-red-800 rounded-md text-left flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-5xl font-bold my-12 h-16">{stimulusWords[currentWordIndex]}</p>
            <div className="flex justify-center space-x-4">
              {!isRecording ? (
                <Button onClick={startRecording} size="lg" className="w-64 h-16 text-xl">
                  <Mic className="w-8 h-8 mr-4" />
                  Start Recording
                </Button>
              ) : (
                <Button onClick={handleNextWord} size="lg" variant="default" className="w-64 h-16 text-xl">
                  <ChevronRight className="w-8 h-8 mr-4" />
                  Next Word
                </Button>
              )}
            </div>
            {isRecording && <p className="text-lg text-gray-500 mt-6">Speak your response and click "Next Word".</p>}
        </CardContent>
      </Card>
      
      {emotions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Emotions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {emotions.slice(0, 5).map((emotion: any) => (
                <div key={emotion.name}>
                  <div className="flex justify-between font-medium">
                    <span>{emotion.name}</span>
                    <span>{(emotion.score * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={emotion.score * 100} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 