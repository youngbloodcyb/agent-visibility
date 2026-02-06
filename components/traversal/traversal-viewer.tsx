"use client";

import { usePlayback } from "@/hooks/use-playback";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/traversal-recorder/types";
import { useMemo } from "react";
import { EntryPanel } from "./entry-panel";
import { FileTreeViewer } from "./file-tree-viewer";
import { SessionControls } from "./session-controls";
import { TimelineScrubber } from "./timeline-scrubber";

export interface TraversalViewerProps {
  session: Session;
  isLive?: boolean;
  className?: string;
}

export function TraversalViewer({
  session,
  isLive = false,
  className,
}: TraversalViewerProps) {
  const playback = usePlayback({ session, followLive: isLive });

  // Get highlighted paths from current entry
  const highlightedPaths = useMemo(() => {
    const paths = new Set<string>();
    if (playback.currentEntry) {
      // Add resolved paths from the command
      for (const path of playback.currentEntry.resolvedPaths) {
        paths.add(path);
      }
      // If no paths were extracted, highlight the current working directory
      // This handles commands like "ls -la" that implicitly operate on cwd
      if (paths.size === 0 && playback.currentEntry.cwd) {
        paths.add(playback.currentEntry.cwd);
      }
    }
    return paths;
  }, [playback.currentEntry]);

  return (
    <div className={cn("flex h-full flex-col gap-4", className)}>
      {/* Controls */}
      <SessionControls
        isPlaying={playback.isPlaying}
        speed={playback.speed}
        currentIndex={playback.currentIndex}
        totalEntries={playback.totalEntries}
        isLive={isLive}
        onPlay={playback.play}
        onPause={playback.pause}
        onStepForward={playback.stepForward}
        onStepBack={playback.stepBack}
        onReset={playback.reset}
        onSpeedChange={playback.setSpeed}
      />

      {/* Timeline */}
      <TimelineScrubber
        entries={session.entries}
        currentIndex={playback.currentIndex}
        onChange={playback.goTo}
        className="shrink-0"
      />

      {/* Main content: 3-column layout */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* File tree */}
        <div className="min-h-0 overflow-hidden rounded-lg border lg:col-span-1">
          <FileTreeViewer
            filesystem={session.filesystem}
            highlightedPaths={highlightedPaths}
            operation={playback.currentEntry?.operation}
            className="h-full"
          />
        </div>

        {/* Entry details */}
        <div className="min-h-0 overflow-hidden lg:col-span-2">
          <EntryPanel entry={playback.currentEntry} className="h-full" />
        </div>
      </div>
    </div>
  );
}
