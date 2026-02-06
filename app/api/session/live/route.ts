import type { NextRequest } from "next/server";

// Store active session emitters for SSE
const activeRecorders = new Map<
  string,
  import("@/lib/traversal-recorder").SessionRecorder
>();

/**
 * Register a session recorder for live streaming
 */
export function registerRecorder(
  sessionId: string,
  recorder: import("@/lib/traversal-recorder").SessionRecorder
) {
  activeRecorders.set(sessionId, recorder);
}

/**
 * Unregister a session recorder
 */
export function unregisterRecorder(sessionId: string) {
  activeRecorders.delete(sessionId);
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "sessionId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const recorder = activeRecorders.get(sessionId);

  if (!recorder) {
    return new Response(JSON.stringify({ error: "Session not found or not active" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const emitter = recorder.getEmitter();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (type: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      // Send initial session state
      sendEvent("init", {
        session: recorder.session,
      });

      // Subscribe to events
      const onEntry = (entry: unknown) => sendEvent("entry", entry);
      const onFilesystem = (tree: unknown) => sendEvent("filesystem", tree);
      const onSessionEnd = (session: unknown) => {
        sendEvent("session-end", session);
        cleanup();
        controller.close();
      };

      emitter.on("entry", onEntry);
      emitter.on("filesystem", onFilesystem);
      emitter.on("session-end", onSessionEnd);

      const cleanup = () => {
        emitter.off("entry", onEntry);
        emitter.off("filesystem", onFilesystem);
        emitter.off("session-end", onSessionEnd);
      };

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
