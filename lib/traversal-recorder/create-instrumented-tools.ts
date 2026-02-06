import type { Sandbox } from "@vercel/sandbox";
import { createBashTool } from "bash-tool";
import { captureFilesystemSnapshot } from "./filesystem-snapshot";
import { SessionRecorder } from "./session-recorder";
import type { Session, TraversalEntry } from "./types";

export interface CreateInstrumentedToolsOptions {
  sandbox: Sandbox;
  rootPath: string;
  onEntry?: (entry: TraversalEntry) => void;
  onFilesystemChange?: (tree: Session["filesystem"]) => void;
  metadata?: Session["metadata"];
}

export interface InstrumentedTools {
  tools: Awaited<ReturnType<typeof createBashTool>>["tools"];
  recorder: SessionRecorder;
  getSession: () => Session;
  exportSession: () => string;
  endSession: () => Session;
}

/**
 * Create bash-tool with recording hooks for traversal visualization
 */
export async function createInstrumentedTools(
  options: CreateInstrumentedToolsOptions
): Promise<InstrumentedTools> {
  const { sandbox, rootPath, onEntry, onFilesystemChange, metadata } = options;

  const recorder = new SessionRecorder(rootPath, metadata);

  // Capture initial filesystem
  const initialTree = await captureFilesystemSnapshot(sandbox, rootPath);
  recorder.setFilesystem(initialTree);
  onFilesystemChange?.(initialTree);

  // Track command start times for duration calculation
  const commandStartTimes = new Map<string, number>();

  const { tools } = await createBashTool({
    sandbox,

    onBeforeBashCall: ({ command }) => {
      // Record start time for duration tracking
      commandStartTimes.set(command, Date.now());

      // Could add command blocking here if needed
      // if (command.includes('rm -rf /')) {
      //   return { command: 'echo "Blocked dangerous command"' };
      // }
      return undefined;
    },

    onAfterBashCall: ({ command, result }) => {
      const startTime = commandStartTimes.get(command);
      commandStartTimes.delete(command);

      const entry = recorder.recordBash(
        command,
        {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
        startTime
      );

      onEntry?.(entry);

      // Refresh filesystem on write operations (async, fire and forget)
      if (entry.operation === "write") {
        captureFilesystemSnapshot(sandbox, rootPath)
          .then((newTree) => {
            recorder.setFilesystem(newTree);
            onFilesystemChange?.(newTree);
          })
          .catch((error) => {
            console.error("Failed to refresh filesystem after write:", error);
          });
      }

      return undefined;
    },
  });

  return {
    tools,
    recorder,
    getSession: () => recorder.session,
    exportSession: () => JSON.stringify(recorder.session, null, 2),
    endSession: () => recorder.endSession(),
  };
}
