"use client";

import { cn } from "@/lib/utils";
import type { Operation, TraversalEntry } from "@/lib/traversal-recorder/types";
import {
  FileIcon,
  FolderIcon,
  NavigationIcon,
  PencilIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react";
import type { HTMLAttributes } from "react";

const OPERATION_COLORS: Record<Operation, string> = {
  read: "bg-blue-500",
  list: "bg-green-500",
  write: "bg-orange-500",
  navigate: "bg-purple-500",
  search: "bg-yellow-500",
  execute: "bg-red-500",
  other: "bg-gray-500",
};

const OPERATION_ICONS: Record<Operation, React.ReactNode> = {
  read: <FileIcon className="size-3" />,
  list: <FolderIcon className="size-3" />,
  write: <PencilIcon className="size-3" />,
  navigate: <NavigationIcon className="size-3" />,
  search: <SearchIcon className="size-3" />,
  execute: <TerminalIcon className="size-3" />,
  other: <TerminalIcon className="size-3" />,
};

export interface TimelineScrubberProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  entries: TraversalEntry[];
  currentIndex: number;
  onChange: (index: number) => void;
}

export function TimelineScrubber({
  entries,
  currentIndex,
  onChange,
  className,
  ...props
}: TimelineScrubberProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  const handleDotClick = (index: number) => {
    onChange(index);
  };

  if (entries.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-4 text-sm text-muted-foreground",
          className
        )}
        {...props}
      >
        No entries recorded
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Slider */}
      <div className="px-2">
        <input
          type="range"
          min={0}
          max={entries.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full accent-primary"
        />
      </div>

      {/* Timeline dots */}
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1">
        {entries.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => handleDotClick(index)}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full transition-all",
              OPERATION_COLORS[entry.operation],
              index === currentIndex
                ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-background"
                : "opacity-60 hover:opacity-100"
            )}
            title={`${entry.operation}: ${entry.command ?? entry.filePath}`}
          >
            {OPERATION_ICONS[entry.operation]}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-2 text-xs text-muted-foreground">
        {Object.entries(OPERATION_COLORS).map(([op, color]) => (
          <div key={op} className="flex items-center gap-1">
            <span className={cn("size-2 rounded-full", color)} />
            <span className="capitalize">{op}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
