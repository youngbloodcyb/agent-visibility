"use client";

import { TraversalViewer } from "@/components/traversal";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/traversal-recorder/types";
import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TraversalSessionPage({ params }: PageProps) {
  const { id } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/session/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Session not found");
        }
        throw new Error("Failed to fetch session");
      }
      const data = await response.json();
      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCwIcon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/traversal">
              <ArrowLeftIcon className="mr-2 size-4" />
              Back to sessions
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
          <p className="text-lg font-medium text-destructive">
            {error || "Session not found"}
          </p>
          <Button onClick={fetchSession} variant="outline" className="mt-4">
            <RefreshCwIcon className="mr-2 size-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/traversal">
              <ArrowLeftIcon className="mr-2 size-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="font-mono text-lg font-bold">{session.id}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(session.startedAt).toLocaleString()}
              {session.endedAt && (
                <> - {new Date(session.endedAt).toLocaleString()}</>
              )}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {session.entries.length} entries | {session.rootPath}
        </div>
      </div>

      {/* Viewer */}
      <div className="min-h-0 flex-1">
        <TraversalViewer session={session} />
      </div>
    </div>
  );
}
