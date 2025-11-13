// Merkle DAG: components.word_display
// Word display component with audio playback

import React, { useEffect, useRef, useState } from 'react'
import type { JungWord } from '../lib/jung-words'

interface WordDisplayProps {
  word: JungWord
  currentIndex: number
  totalWords: number
  onWordDisplayed: () => void
  autoAdvance?: boolean
  displayDuration?: number
}

export default function WordDisplay({
  word,
  currentIndex,
  totalWords,
  onWordDisplayed,
  autoAdvance = true,
  displayDuration = 3000,
}: WordDisplayProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Trigger word displayed event
    onWordDisplayed()

    // Try to play audio if available (optional, graceful degradation)
    const audioPath = `/audio/jung-voice-assessment/${word.id}.mp3`
    if (audioRef.current) {
      audioRef.current.src = audioPath
      audioRef.current.play().catch((err) => {
        // Audio file may not exist, that's okay
        console.debug('Audio playback skipped (file may not exist):', audioPath)
        setIsPlaying(false)
      })
      setIsPlaying(true)
      
      audioRef.current.onended = () => setIsPlaying(false)
      audioRef.current.onerror = () => setIsPlaying(false)
    }

    // Auto advance after duration
    if (autoAdvance) {
      timeoutRef.current = setTimeout(() => {
        setIsPlaying(false)
      }, displayDuration)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [word.id, autoAdvance, displayDuration, onWordDisplayed])

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Progress indicator */}
      <div className="mb-4 w-full max-w-md">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>単語 {currentIndex + 1} / {totalWords}</span>
          <span>{Math.round(((currentIndex + 1) / totalWords) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalWords) * 100}%` }}
          />
        </div>
      </div>

      {/* Word display */}
      <div className="text-center mb-4">
        <h2 className="text-6xl md:text-8xl font-bold text-gray-900 dark:text-white mb-2">
          {word.japanese}
        </h2>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-1">
          {word.english}
        </p>
        <p className="text-lg text-gray-500 dark:text-gray-500">
          {word.pronunciation}
        </p>
      </div>

      {/* Audio player (hidden) */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => {
          console.warn('Audio error:', e)
          setIsPlaying(false)
        }}
        className="hidden"
      />

      {/* Audio status indicator */}
      {isPlaying && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          <span>音声再生中...</span>
        </div>
      )}
    </div>
  )
}

