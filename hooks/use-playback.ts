"use client";

import type { Session, TraversalEntry } from "@/lib/traversal-recorder/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export interface UsePlaybackOptions {
  session: Session;
  autoPlay?: boolean;
  initialSpeed?: PlaybackSpeed;
  /** When true, automatically follows the latest entry as new ones arrive */
  followLive?: boolean;
}

export interface UsePlaybackReturn {
  currentIndex: number;
  currentEntry: TraversalEntry | null;
  isPlaying: boolean;
  isFollowingLive: boolean;
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
  followLatest: () => void;
}

export function usePlayback({
  session,
  autoPlay = false,
  initialSpeed = 1,
  followLive = false,
}: UsePlaybackOptions): UsePlaybackReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFollowingLive, setIsFollowingLive] = useState(followLive);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(initialSpeed);
  const intervalRef = useRef<number | null>(null);
  const prevEntriesLengthRef = useRef(session.entries.length);

  const entries = session.entries;
  const totalEntries = entries.length;
  const currentEntry = entries[currentIndex] ?? null;
  const progress = totalEntries > 0 ? (currentIndex / Math.max(totalEntries - 1, 1)) * 100 : 0;

  // Auto-follow when new entries arrive in live mode
  useEffect(() => {
    if (isFollowingLive && totalEntries > prevEntriesLengthRef.current) {
      // New entry arrived, jump to it
      setCurrentIndex(totalEntries - 1);
    }
    prevEntriesLengthRef.current = totalEntries;
  }, [totalEntries, isFollowingLive]);

  // Start following live when followLive prop changes to true
  useEffect(() => {
    if (followLive) {
      setIsFollowingLive(true);
      // Jump to latest entry
      if (totalEntries > 0) {
        setCurrentIndex(totalEntries - 1);
      }
    }
  }, [followLive, totalEntries]);

  // Calculate interval based on speed
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
    if (isPlaying && totalEntries > 0 && !isFollowingLive) {
      intervalRef.current = window.setInterval(advance, getInterval());
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, advance, getInterval, totalEntries, isFollowingLive]);

  const play = useCallback(() => {
    setIsFollowingLive(false);
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
      // When user manually navigates, stop following live
      setIsFollowingLive(false);
      const clampedIndex = Math.max(0, Math.min(index, totalEntries - 1));
      setCurrentIndex(clampedIndex);
    },
    [totalEntries]
  );

  const stepForward = useCallback(() => {
    setIsFollowingLive(false);
    setCurrentIndex((prev) => Math.min(prev + 1, totalEntries - 1));
  }, [totalEntries]);

  const stepBack = useCallback(() => {
    setIsFollowingLive(false);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setIsFollowingLive(false);
    setCurrentIndex(0);
  }, []);

  const followLatest = useCallback(() => {
    setIsPlaying(false);
    setIsFollowingLive(true);
    if (totalEntries > 0) {
      setCurrentIndex(totalEntries - 1);
    }
  }, [totalEntries]);

  return {
    currentIndex,
    currentEntry,
    isPlaying,
    isFollowingLive,
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
    followLatest,
  };
}
