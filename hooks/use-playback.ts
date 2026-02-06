"use client";

import type { Session, TraversalEntry } from "@/lib/traversal-recorder/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export interface UsePlaybackOptions {
  session: Session;
  autoPlay?: boolean;
  initialSpeed?: PlaybackSpeed;
}

export interface UsePlaybackReturn {
  currentIndex: number;
  currentEntry: TraversalEntry | null;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  totalEntries: number;
  progress: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  goTo: (index: number) => void;
  stepForward: () => void;
  stepBack: () => void;
  reset: () => void;
}

export function usePlayback({
  session,
  autoPlay = false,
  initialSpeed = 1,
}: UsePlaybackOptions): UsePlaybackReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(initialSpeed);
  const intervalRef = useRef<number | null>(null);

  const entries = session.entries;
  const totalEntries = entries.length;
  const currentEntry = entries[currentIndex] ?? null;
  const progress = totalEntries > 0 ? (currentIndex / (totalEntries - 1)) * 100 : 0;

  // Calculate interval based on speed
  // Base interval is 1000ms, adjusted by speed
  const getInterval = useCallback(() => {
    return 1000 / speed;
  }, [speed]);

  // Advance to next entry
  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= totalEntries - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [totalEntries]);

  // Set up playback interval
  useEffect(() => {
    if (isPlaying && totalEntries > 0) {
      intervalRef.current = window.setInterval(advance, getInterval());
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, advance, getInterval, totalEntries]);

  const play = useCallback(() => {
    if (currentIndex >= totalEntries - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, [currentIndex, totalEntries]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeedState(newSpeed);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, totalEntries - 1));
      setCurrentIndex(clampedIndex);
    },
    [totalEntries]
  );

  const stepForward = useCallback(() => {
    goTo(currentIndex + 1);
  }, [currentIndex, goTo]);

  const stepBack = useCallback(() => {
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  return {
    currentIndex,
    currentEntry,
    isPlaying,
    speed,
    totalEntries,
    progress,
    play,
    pause,
    toggle,
    setSpeed,
    goTo,
    stepForward,
    stepBack,
    reset,
  };
}
