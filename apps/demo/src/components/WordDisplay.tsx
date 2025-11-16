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
    // Reset playing state when word changes
    setIsPlaying(false)
    
    // Trigger word displayed event (only when word.id changes)
    onWordDisplayed()

    // Try to play audio if available (optional, graceful degradation)
    const audioPath = `/audio/jung-voice-assessment/${word.id}.mp3`
    if (audioRef.current) {
      // Check if audio file exists before attempting to play
      const checkAudioExists = async () => {
        try {
          const response = await fetch(audioPath, { method: 'HEAD' })
          if (response.ok) {
            audioRef.current!.src = audioPath
            await audioRef.current!.play()
            setIsPlaying(true)
          } else {
            // Audio file doesn't exist, skip silently
            setIsPlaying(false)
          }
        } catch (err) {
          // Audio file may not exist or network error, that's okay
          setIsPlaying(false)
        }
      }
      checkAudioExists()
      
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
  }, [word.id, autoAdvance, displayDuration]) // Remove onWordDisplayed from dependencies

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Progress indicator */}
      <div className="mb-2 w-full">
        <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span className="font-medium">単語 {currentIndex + 1} / {totalWords}</span>
          <span className="font-medium">{Math.min(100, Math.round(((currentIndex + 1) / totalWords) * 100))}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, ((currentIndex + 1) / totalWords) * 100)}%` }}
          />
        </div>
      </div>

      {/* Word display */}
      <div className="text-center w-full">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 break-words">
          {word.japanese}
        </h2>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-0.5 font-medium">
          {word.english}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
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
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
          <span>音声再生中...</span>
        </div>
      )}
    </div>
  )
}

