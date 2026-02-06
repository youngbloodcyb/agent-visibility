"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SessionSummary } from "@/lib/traversal-recorder/types";
import { FolderIcon, PlayIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function TraversalSessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/session");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const data = await response.json();
      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this session?")) {
        return;
      }

      try {
        const response = await fetch(`/api/session/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          fetchSessions();
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    [fetchSessions]
  );

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Traversal Sessions</h1>
          <p className="text-muted-foreground">
            View and replay recorded agent filesystem traversals
          </p>
        </div>
        <Button onClick={fetchSessions} variant="outline" disabled={isLoading}>
          <RefreshCwIcon
            className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-8 border-destructive">
          <CardContent className="py-4 text-destructive">{error}</CardContent>
        </Card>
      )}

      {isLoading && sessions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCwIcon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
            <p className="text-lg font-medium">No sessions recorded yet</p>
            <p className="text-muted-foreground">
              Sessions will appear here after running an agent with instrumented
              tools
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-mono text-base">
                      {session.id}
                    </CardTitle>
                    <CardDescription>
                      {new Date(session.startedAt).toLocaleString()}
                      {session.endedAt && (
                        <>
                          {" "}
                          - {new Date(session.endedAt).toLocaleString()}
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm">
                      <Link href={`/traversal/${session.id}`}>
                        <PlayIcon className="mr-1 size-3" />
                        Replay
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(session.id)}
                      className="size-8"
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FolderIcon className="size-4" />
                    <span>{session.rootPath}</span>
                  </div>
                  <div>
                    <span className="font-medium">{session.entryCount}</span>{" "}
                    entries
                  </div>
                  {session.metadata?.runtime && (
                    <div>Runtime: {session.metadata.runtime}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
