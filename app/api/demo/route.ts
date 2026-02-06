import { Sandbox } from "@vercel/sandbox";
import {
  captureFilesystemSnapshot,
  generateDemoFiles,
  saveSession,
  SessionRecorder,
} from "@/lib/traversal-recorder";
import { registerRecorder, unregisterRecorder } from "../session/live/route";

export const maxDuration = 60;

export async function POST() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
        );
      };

      let sandbox: Sandbox | null = null;

      try {
        send("status", "Creating sandbox...");
        sandbox = await Sandbox.create({ runtime: "node24" });

        send("status", "Uploading demo files...");
        const demoFiles = generateDemoFiles();
        await sandbox.writeFiles(demoFiles);

        send("status", "Setting up recorder...");
        const rootPath = "/sandbox";
        const recorder = new SessionRecorder(rootPath);

        // Capture initial filesystem
        const initialTree = await captureFilesystemSnapshot(sandbox, rootPath);
        recorder.setFilesystem(initialTree);

        // Register for live streaming
        registerRecorder(recorder.sessionId, recorder);

        // Forward events to SSE stream
        recorder.on("entry", (entry) => send("entry", entry));
        recorder.on("filesystem", (tree) => send("filesystem", tree));

        // Send initial state
        send("init", {
          sessionId: recorder.sessionId,
          session: recorder.session,
        });

        send("status", "Running exploration...");

        // Helper to run command and record it
        const run = async (cmd: string) => {
          const startTime = Date.now();
          const result = await sandbox!.runCommand("bash", [
            "-c",
            `cd ${rootPath} && ${cmd}`,
          ]);
          const stdout = await result.stdout();
          const stderr = await result.stderr();
          const exitCode = result.exitCode;

          // Record the bash command
          const entry = recorder.recordBash(
            cmd,
            { stdout, stderr, exitCode },
            startTime
          );

          // Refresh filesystem if it was a write operation
          if (entry.operation === "write") {
            const newTree = await captureFilesystemSnapshot(sandbox!, rootPath);
            recorder.setFilesystem(newTree);
          }
        };

        const delay = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        await run("ls -la");
        await delay(500);

        await run("find . -type f -name '*.js' | head -20");
        await delay(500);

        await run("cat package.json");
        await delay(500);

        await run("ls -la src/");
        await delay(300);

        await run("ls -la src/components/");
        await delay(300);

        await run("cat src/index.js");
        await delay(500);

        await run("cat src/components/Button.jsx");
        await delay(500);

        await run("grep -r 'export' src/ | head -10");
        await delay(500);

        await run("ls -la tests/");
        await delay(300);

        await run("cat tests/test.js");
        await delay(500);

        await run("echo 'console.log(\"hello\")' > src/new-file.js");
        await delay(300);

        await run("cat src/new-file.js");
        await delay(300);

        // End and save
        send("status", "Saving session...");
        const session = recorder.endSession();
        await saveSession(session);

        unregisterRecorder(recorder.sessionId);

        send("complete", {
          sessionId: session.id,
          entryCount: session.entries.length,
        });
      } catch (error) {
        send("error", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (sandbox) {
          try {
            await sandbox.stop();
          } catch {
            // Ignore cleanup errors
          }
        }
        controller.close();
      }
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
