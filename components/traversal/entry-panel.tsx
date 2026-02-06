"use client";

import { Terminal } from "@/components/ai-elements/terminal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Operation, TraversalEntry } from "@/lib/traversal-recorder/types";
import {
  ClockIcon,
  FileIcon,
  FolderIcon,
  NavigationIcon,
  PencilIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react";
import type { HTMLAttributes } from "react";

const OPERATION_BADGE_VARIANTS: Record<
  Operation,
  "default" | "secondary" | "destructive" | "outline"
> = {
  read: "secondary",
  list: "secondary",
  write: "destructive",
  navigate: "outline",
  search: "secondary",
  execute: "default",
  other: "outline",
};

const OPERATION_ICONS: Record<Operation, React.ReactNode> = {
  read: <FileIcon className="size-4" />,
  list: <FolderIcon className="size-4" />,
  write: <PencilIcon className="size-4" />,
  navigate: <NavigationIcon className="size-4" />,
  search: <SearchIcon className="size-4" />,
  execute: <TerminalIcon className="size-4" />,
  other: <TerminalIcon className="size-4" />,
};

export interface EntryPanelProps extends HTMLAttributes<HTMLDivElement> {
  entry: TraversalEntry | null;
}

export function EntryPanel({ entry, className, ...props }: EntryPanelProps) {
  if (!entry) {
    return (
      <Card className={cn("flex items-center justify-center", className)} {...props}>
        <CardContent className="text-center text-muted-foreground">
          <p>Select an entry to view details</p>
        </CardContent>
      </Card>
    );
  }

  const displayCommand = entry.command ?? entry.filePath ?? "Unknown";
  const hasOutput = entry.stdout || entry.stderr;

  return (
    <Card className={cn("flex flex-col overflow-hidden", className)} {...props}>
      <CardHeader className="shrink-0 space-y-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {OPERATION_ICONS[entry.operation]}
            <span className="capitalize">{entry.operation}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={OPERATION_BADGE_VARIANTS[entry.operation]}>
              {entry.tool}
            </Badge>
            {entry.exitCode !== undefined && (
              <Badge
                variant={entry.exitCode === 0 ? "secondary" : "destructive"}
              >
                exit: {entry.exitCode}
              </Badge>
            )}
          </div>
        </div>

        {/* Command or file path */}
        <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
          {displayCommand}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FolderIcon className="size-3" />
            <span>cwd: {entry.cwd}</span>
          </div>
          {entry.duration !== undefined && (
            <div className="flex items-center gap-1">
              <ClockIcon className="size-3" />
              <span>{entry.duration}ms</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <ClockIcon className="size-3" />
            <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Resolved paths */}
        {entry.resolvedPaths.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Resolved Paths:
            </div>
            <div className="flex flex-wrap gap-1">
              {entry.resolvedPaths.map((path, index) => (
                <Badge key={index} variant="outline" className="font-mono text-xs">
                  {path}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      {/* Output */}
      {hasOutput && (
        <CardContent className="flex-1 overflow-hidden pt-0">
          <Terminal
            output={entry.stdout || entry.stderr || ""}
            className="h-full max-h-64"
          />
        </CardContent>
      )}
    </Card>
  );
}
