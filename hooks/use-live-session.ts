"use client";

import type {
  FileNode,
  Session,
  TraversalEntry,
} from "@/lib/traversal-recorder/types";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseLiveSessionOptions {
  sessionId: string;
  onEntry?: (entry: TraversalEntry) => void;
  onFilesystem?: (tree: FileNode) => void;
  onSessionEnd?: (session: Session) => void;
}

export interface UseLiveSessionReturn {
  session: Session | null;
  entries: TraversalEntry[];
  filesystem: FileNode | null;
  isConnected: boolean;
  isEnded: boolean;
  error: Error | null;
  reconnect: () => void;
}

type SSEEvent =
  | { type: "init"; data: { session: Session } }
  | { type: "entry"; data: TraversalEntry }
  | { type: "filesystem"; data: FileNode }
  | { type: "session-end"; data: Session };

export function useLiveSession({
  sessionId,
  onEntry,
  onFilesystem,
  onSessionEnd,
}: UseLiveSessionOptions): UseLiveSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<TraversalEntry[]>([]);
  const [filesystem, setFilesystem] = useState<FileNode | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setError(null);

    const eventSource = new EventSource(
      `/api/session/live?sessionId=${encodeURIComponent(sessionId)}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as SSEEvent;

        switch (parsed.type) {
          case "init":
            setSession(parsed.data.session);
            setEntries(parsed.data.session.entries);
            setFilesystem(parsed.data.session.filesystem);
            break;

          case "entry":
            setEntries((prev) => [...prev, parsed.data]);
            onEntry?.(parsed.data);
            break;

          case "filesystem":
            setFilesystem(parsed.data);
            onFilesystem?.(parsed.data);
            break;

          case "session-end":
            setSession(parsed.data);
            setIsEnded(true);
            onSessionEnd?.(parsed.data);
            eventSource.close();
            break;
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      if (!isEnded) {
        setError(new Error("Connection lost"));

        // Auto-reconnect after 2 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 2000);
      }
    };
  }, [sessionId, isEnded, onEntry, onFilesystem, onSessionEnd]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    setIsEnded(false);
    connect();
  }, [connect]);

  return {
    session,
    entries,
    filesystem,
    isConnected,
    isEnded,
    error,
    reconnect,
  };
}
