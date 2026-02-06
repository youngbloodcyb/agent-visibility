"use client";

import { TraversalViewer } from "@/components/traversal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  FileNode,
  Session,
  TraversalEntry,
} from "@/lib/traversal-recorder/types";
import { PlayIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

type DemoState = "idle" | "running" | "complete" | "error";

export default function DemoPage() {
  const [state, setState] = useState<DemoState>("idle");
  const [status, setStatus] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDemo = useCallback(async () => {
    setState("running");
    setStatus("Starting...");
    setError(null);
    setSession(null);

    try {
      const response = await fetch("/api/demo", { method: "POST" });

      if (!response.ok) {
        throw new Error("Failed to start demo");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "status":
                setStatus(data.data);
                break;

              case "init":
                setSession(data.data.session);
                break;

              case "entry":
                setSession((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    entries: [...prev.entries, data.data as TraversalEntry],
                  };
                });
                break;

              case "filesystem":
                setSession((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    filesystem: data.data as FileNode,
                  };
                });
                break;

              case "complete":
                setState("complete");
                setStatus(
                  `Complete! ${data.data.entryCount} entries recorded.`
                );
                break;

              case "error":
                setState("error");
                setError(data.data.message);
                break;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  return (
    <div className="flex h-screen flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Demo</h1>
          <p className="text-muted-foreground">
            Watch an agent explore a filesystem in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state === "complete" && session && (
            <Button asChild variant="outline">
              <Link href={`/traversal/${session.id}`}>View Replay</Link>
            </Button>
          )}
          <Button
            onClick={runDemo}
            disabled={state === "running"}
            className="gap-2"
          >
            {state === "running" ? (
              <>
                <RefreshCwIcon className="size-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon className="size-4" />
                {state === "idle" ? "Run Demo" : "Run Again"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status bar */}
      {status && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          {state === "running" && (
            <RefreshCwIcon className="size-4 animate-spin" />
          )}
          <span>{status}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="mb-4 border-destructive">
          <CardContent className="py-4 text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Main content */}
      <div className="min-h-0 flex-1">
        {state === "idle" ? (
          <Card className="flex h-full items-center justify-center">
            <CardContent className="text-center">
              <p className="mb-4 text-lg">
                Click &quot;Run Demo&quot; to start a live traversal demonstration
              </p>
              <p className="text-sm text-muted-foreground">
                This will create a sandbox, populate it with files, and run
                exploration commands while you watch
              </p>
            </CardContent>
          </Card>
        ) : session ? (
          <TraversalViewer session={session} isLive={state === "running"} />
        ) : (
          <Card className="flex h-full items-center justify-center">
            <CardContent>
              <RefreshCwIcon className="mx-auto size-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
