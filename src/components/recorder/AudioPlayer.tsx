import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Minus, Plus } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  initialDuration?: number;
}

export default function AudioPlayer({ audioUrl, initialDuration = 0 }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSpeedChange = (increment: boolean) => {
    if (audioRef.current) {
      const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
      const currentIndex = speeds.indexOf(playbackRate);
      let newIndex = increment 
        ? Math.min(currentIndex + 1, speeds.length - 1)
        : Math.max(currentIndex - 1, 0);
      
      const newSpeed = speeds[newIndex];
      audioRef.current.playbackRate = newSpeed;
      setPlaybackRate(newSpeed);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full max-w-full px-1">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          disabled={!audioUrl}
          className="p-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={handleReset}
          disabled={!audioUrl}
          className="p-2 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex items-center">
          <button
            onClick={() => handleSpeedChange(false)}
            disabled={!audioUrl || playbackRate <= 0.5}
            className="p-1 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Decrease Speed"
          >
            <Minus className="w-3 h-3" />
          </button>
          
          <span className="w-12 text-center text-xs font-medium text-gray-600">
            {playbackRate}x
          </span>
          
          <button
            onClick={() => handleSpeedChange(true)}
            disabled={!audioUrl || playbackRate >= 2}
            className="p-1 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Increase Speed"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <span className="text-xs text-gray-500 w-10 text-right flex-shrink-0">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          disabled={!audioUrl}
          className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
        />
        <span className="text-xs text-gray-500 w-10 flex-shrink-0">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}