"use client";

import { cn } from "@selectio/ui";
import { FileText, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VoicePlayerProps {
  src: string;
  isOutgoing?: boolean;
  messageId?: string;
  fileId?: string;
  hasTranscription?: boolean;
  onTranscribe?: () => void;
  isTranscribing?: boolean;
}

export function VoicePlayer({
  src,
  isOutgoing = false,
  messageId,
  fileId,
  hasTranscription = false,
  onTranscribe,
  isTranscribing = false,
}: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setTotalDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Ошибка воспроизведения аудио:", error);
        setIsPlaying(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const canTranscribe =
    messageId && fileId && !hasTranscription && onTranscribe;

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio ref={audioRef} src={src} preload="metadata">
        <track kind="captions" />
      </audio>

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0",
          isOutgoing
            ? "bg-white/20 hover:bg-white/30"
            : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
        )}
      >
        {isPlaying ? (
          <Pause
            className={cn("w-4 h-4", isOutgoing ? "text-white" : "text-black")}
            fill="currentColor"
          />
        ) : (
          <Play
            className={cn(
              "w-4 h-4 ml-0.5",
              isOutgoing ? "text-white" : "text-black",
            )}
            fill="currentColor"
          />
        )}
      </button>

      {/* Progress Bar */}
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-1 bg-white/20 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isOutgoing ? "bg-white" : "bg-teal-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time */}
        <span className="text-xs opacity-70 whitespace-nowrap tabular-nums">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>

      {/* Transcribe Button */}
      {canTranscribe && (
        <button
          type="button"
          onClick={onTranscribe}
          disabled={isTranscribing}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0",
            isTranscribing && "opacity-50 cursor-not-allowed",
            isOutgoing
              ? "bg-white/20 hover:bg-white/30"
              : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
          )}
          title="Транскрибировать"
        >
          <FileText
            className={cn(
              "w-4 h-4",
              isOutgoing ? "text-white" : "text-black",
              isTranscribing && "animate-pulse",
            )}
          />
        </button>
      )}
    </div>
  );
}
