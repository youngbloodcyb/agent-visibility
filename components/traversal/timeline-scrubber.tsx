"use client";

import { cn } from "@/lib/utils";
import type { Operation, TraversalEntry } from "@/lib/traversal-recorder/types";
import { motion, AnimatePresence } from "motion/react";
import {
  FileIcon,
  FolderIcon,
  NavigationIcon,
  PencilIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react";
import type { HTMLAttributes } from "react";

const OPERATION_COLORS: Record<Operation, { bg: string; glow: string }> = {
  read: { bg: "bg-blue-500", glow: "rgba(59, 130, 246, 0.6)" },
  list: { bg: "bg-green-500", glow: "rgba(34, 197, 94, 0.6)" },
  write: { bg: "bg-orange-500", glow: "rgba(249, 115, 22, 0.6)" },
  navigate: { bg: "bg-purple-500", glow: "rgba(168, 85, 247, 0.6)" },
  search: { bg: "bg-yellow-500", glow: "rgba(234, 179, 8, 0.6)" },
  execute: { bg: "bg-red-500", glow: "rgba(239, 68, 68, 0.6)" },
  other: { bg: "bg-gray-500", glow: "rgba(107, 114, 128, 0.6)" },
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

  const progress = entries.length > 1 ? (currentIndex / (entries.length - 1)) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
        {/* Animated pulse at the current position */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full bg-primary"
          initial={{ left: 0 }}
          animate={{
            left: `calc(${progress}% - 8px)`,
            scale: [1, 1.2, 1],
          }}
          transition={{
            left: { duration: 0.3, ease: "easeOut" },
            scale: { duration: 0.5, repeat: Infinity, repeatDelay: 1 }
          }}
          style={{ boxShadow: "0 0 10px rgba(var(--primary), 0.5)" }}
        />
      </div>

      {/* Timeline dots */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-2 py-2 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {entries.map((entry, index) => {
            const isActive = index === currentIndex;
            const colors = OPERATION_COLORS[entry.operation];

            return (
              <motion.button
                key={entry.id}
                type="button"
                onClick={() => handleDotClick(index)}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: 1,
                  scale: isActive ? 1.3 : 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                whileHover={{ scale: isActive ? 1.4 : 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  opacity: { duration: 0.2 }
                }}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-white transition-shadow",
                  colors.bg,
                  isActive ? "ring-2 ring-white ring-offset-2 ring-offset-background" : "opacity-70"
                )}
                style={isActive ? { boxShadow: `0 0 20px ${colors.glow}` } : undefined}
                title={`${entry.operation}: ${entry.command ?? entry.filePath}`}
              >
                {OPERATION_ICONS[entry.operation]}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-2 text-xs text-muted-foreground">
        {Object.entries(OPERATION_COLORS).map(([op, { bg }]) => (
          <div key={op} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", bg)} />
            <span className="capitalize">{op}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
