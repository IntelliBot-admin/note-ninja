'use client'

import { useState, useRef, useEffect } from 'react'
import { PlayIcon, PauseIcon } from 'lucide-react'


export interface Word {
   text: string;
   start: number;
   end: number;
   confidence: number;
   speaker: string;
}

export interface Utterance {
   confidence: number;
   end: number;
   speaker: string;
   start: number;
   text: string;
   words: Word[];
}

export interface Transcript {
   utterances: Utterance[];
}


interface EnhancedHyperAudioTranscriptProps {
   transcript: Transcript
   audioSrc: string
}

export default function EnhancedHyperAudioTranscript({ transcript, audioSrc }: EnhancedHyperAudioTranscriptProps) {
   const [currentTime, setCurrentTime] = useState(0)
   const [isPlaying, setIsPlaying] = useState(false)
   const [audioLoaded, setAudioLoaded] = useState(false)
   const [audioError, setAudioError] = useState<string | null>(null)
   const audioRef = useRef<HTMLAudioElement>(null)
   const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

   const allWords = transcript.utterances.flatMap(utterance => utterance.words)

   useEffect(() => {
      const audioElement = audioRef.current
      if (!audioElement) return

      const updateTime = () => setCurrentTime(audioElement.currentTime * 1000)
      const handleLoadedData = () => setAudioLoaded(true)
      const handleError = () => {
         setAudioError("Failed to load audio. Please check the audio source.")
         setAudioLoaded(false)
      }

      audioElement.addEventListener('timeupdate', updateTime)
      audioElement.addEventListener('loadeddata', handleLoadedData)
      audioElement.addEventListener('error', handleError)

      return () => {
         audioElement.removeEventListener('timeupdate', updateTime)
         audioElement.removeEventListener('loadeddata', handleLoadedData)
         audioElement.removeEventListener('error', handleError)
      }
   }, [])

   const togglePlayPause = () => {
      if (audioRef.current) {
         if (isPlaying) {
            audioRef.current.pause()
         } else {
            audioRef.current.play().catch(error => {
               console.error("Error playing audio:", error)
               setAudioError("Failed to play audio. Please try again.")
            })
         }
         setIsPlaying(!isPlaying)
      }
   }

   const handleWordClick = (startTime: number) => {
      if (audioRef.current) {
         audioRef.current.currentTime = startTime / 1000
         if (!isPlaying) {
            audioRef.current.play().catch(console.error)
            setIsPlaying(true)
         }
      }
   }

   useEffect(() => {
      const currentWord = allWords.find(
         (word, index) =>
            currentTime >= word.start &&
            (index === allWords.length - 1 || currentTime < allWords[index + 1].start)
      )

      if (currentWord) {
         const wordIndex = allWords.indexOf(currentWord)
         wordRefs.current[wordIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
         })
      }
   }, [currentTime, allWords])

   const getConfidenceColor = (confidence: number) => {
      if (confidence > 0.8) return 'text-indigo-600'
      if (confidence > 0.6) return 'text-indigo-400'
      return 'text-indigo-300'
   }

   return (
      <div className="w-full bg-white rounded-lg shadow-sm">
         <div className="p-4 border-b border-gray-100">
            <audio ref={audioRef} src={audioSrc} />
            {audioLoaded ? (
               <button
                  onClick={togglePlayPause}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
               >
                  {isPlaying ? (
                     <PauseIcon className="w-5 h-5" />
                  ) : (
                     <PlayIcon className="w-5 h-5" />
                  )}
               </button>
            ) : (
               <p className="text-indigo-600">Loading audio...</p>
            )}
            {audioError && <p className="text-red-500 mt-2 text-sm">{audioError}</p>}
         </div>
         <div className="transcript-container p-4 h-[calc(100vh-200px)] overflow-y-auto">
            {transcript.utterances.map((utterance, utteranceIndex) => (
               <div key={utteranceIndex} className="mb-6">
                  <div className="font-medium text-sm text-gray-500 mb-2">Speaker {utterance.speaker}</div>
                  <div className="space-y-1">
                     {utterance.words.map((word, wordIndex) => {
                        const globalWordIndex = allWords.findIndex(w => w === word)
                        return (
                           <span
                              key={`${utteranceIndex}-${wordIndex}`}
                              ref={(el) => (wordRefs.current[globalWordIndex] = el)}
                              onClick={() => handleWordClick(word.start)}
                              className={`cursor-pointer transition-colors duration-150 rounded px-0.5 ${currentTime >= word.start && currentTime < word.end
                                 ? 'bg-indigo-100'
                                 : 'hover:bg-gray-100'
                                 } ${getConfidenceColor(word.confidence)}`}
                              title={`Confidence: ${(word.confidence * 100).toFixed(2)}%`}
                           >
                              {word.text}{' '}
                           </span>
                        )
                     })}
                  </div>
               </div>
            ))}
         </div>
      </div>
   )
}

