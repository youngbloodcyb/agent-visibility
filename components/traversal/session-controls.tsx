"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlaybackSpeed } from "@/hooks/use-playback";
import {
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SkipBackIcon,
  SkipForwardIcon,
  RadioIcon,
} from "lucide-react";
import type { HTMLAttributes } from "react";

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4];

export interface SessionControlsProps extends HTMLAttributes<HTMLDivElement> {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentIndex: number;
  totalEntries: number;
  isLive?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}

export function SessionControls({
  isPlaying,
  speed,
  currentIndex,
  totalEntries,
  isLive = false,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
  onSpeedChange,
  className,
  ...props
}: SessionControlsProps) {
  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex >= totalEntries - 1;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-3",
        className
      )}
      {...props}
    >
      {/* Left side: Play controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onReset}
          disabled={isAtStart && !isPlaying}
          title="Reset"
        >
          <RotateCcwIcon className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onStepBack}
          disabled={isAtStart}
          title="Step back"
        >
          <SkipBackIcon className="size-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          onClick={isPlaying ? onPause : onPlay}
          disabled={isAtEnd && !isPlaying}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <PauseIcon className="size-4" />
          ) : (
            <PlayIcon className="size-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onStepForward}
          disabled={isAtEnd}
          title="Step forward"
        >
          <SkipForwardIcon className="size-4" />
        </Button>
      </div>

      {/* Center: Progress indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-mono">
          {currentIndex + 1} / {totalEntries}
        </span>
        {isLive && (
          <Badge variant="destructive" className="animate-pulse gap-1">
            <RadioIcon className="size-3" />
            LIVE
          </Badge>
        )}
      </div>

      {/* Right side: Speed controls */}
      <div className="flex items-center gap-1">
        <span className="mr-2 text-xs text-muted-foreground">Speed:</span>
        {SPEEDS.map((s) => (
          <Button
            key={s}
            variant={speed === s ? "default" : "outline"}
            size="sm"
            onClick={() => onSpeedChange(s)}
            className="h-7 px-2 text-xs"
          >
            {s}x
          </Button>
        ))}
      </div>
    </div>
  );
}
