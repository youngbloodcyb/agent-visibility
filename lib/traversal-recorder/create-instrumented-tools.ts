import type { Sandbox } from "@vercel/sandbox";
import { createBashTool } from "bash-tool";
import { captureFilesystemSnapshot } from "./filesystem-snapshot";
import { SessionRecorder } from "./session-recorder";
import type { Session, TraversalEntry } from "./types";

export interface CreateInstrumentedToolsOptions {
  /** Vercel Sandbox instance */
  sandbox: Sandbox;
  /** Files to pre-populate in the sandbox (bash-tool format) */
  files?: Record<string, string>;
  /** Destination directory for files (defaults to /workspace) */
  destination?: string;
  /** Callback when a new entry is recorded */
  onEntry?: (entry: TraversalEntry) => void;
  /** Callback when filesystem changes */
  onFilesystemChange?: (tree: Session["filesystem"]) => void;
  /** Optional session metadata */
  metadata?: Session["metadata"];
}

export interface InstrumentedTools {
  tools: Awaited<ReturnType<typeof createBashTool>>["tools"];
  recorder: SessionRecorder;
  /** The root path where files are stored */
  rootPath: string;
  /** Execute a bash command (convenience wrapper that triggers recording) */
  run: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  getSession: () => Session;
  exportSession: () => string;
  endSession: () => Session;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Default destination for Vercel sandbox
const VERCEL_SANDBOX_DESTINATION = "/vercel/sandbox/workspace";

/**
 * Create bash-tool with recording hooks for traversal visualization.
 * Uses bash-tool to load files into the sandbox and intercept commands.
 */
export async function createInstrumentedTools(
  options: CreateInstrumentedToolsOptions
): Promise<InstrumentedTools> {
  const { sandbox, files, destination, onEntry, onFilesystemChange, metadata } =
    options;

  // Determine root path (bash-tool uses this as the working directory)
  const rootPath = destination ?? VERCEL_SANDBOX_DESTINATION;

  // Create recorder first so hooks can use it
  const recorder = new SessionRecorder(rootPath, metadata);

  // Track command start times for duration calculation
  const commandStartTimes = new Map<string, number>();

  const { tools } = await createBashTool({
    sandbox,
    files,
    destination: rootPath,

    onBeforeBashCall: ({ command }) => {
      // Record start time for duration tracking
      commandStartTimes.set(command, Date.now());
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

  // Capture initial filesystem
  const initialTree = await captureFilesystemSnapshot(sandbox, rootPath);
  recorder.setFilesystem(initialTree);
  onFilesystemChange?.(initialTree);

  // Create a run helper that executes commands through the bash tool
  // This triggers the hooks which handle recording
  const run = async (command: string): Promise<CommandResult> => {
    // Use AI SDK tool execute with required options
    const result = await tools.bash.execute!(
      { command },
      {
        toolCallId: `run-${Date.now()}`,
        messages: [],
      }
    );
    return result as CommandResult;
  };

  return {
    tools,
    recorder,
    rootPath,
    run,
    getSession: () => recorder.session,
    exportSession: () => JSON.stringify(recorder.session, null, 2),
    endSession: () => recorder.endSession(),
  };
}
