import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import { classifyCommand } from "./command-classifier";
import { extractAndResolvePaths } from "./path-extractor";
import type { FileNode, Session, TraversalEntry } from "./types";

export type SessionEvent = "entry" | "filesystem" | "session-end";

export class SessionRecorder {
  private _session: Session;
  private emitter: EventEmitter;
  private cwd: string;

  constructor(rootPath: string, metadata?: Session["metadata"]) {
    this._session = {
      id: nanoid(),
      startedAt: Date.now(),
      rootPath,
      filesystem: {
        name: rootPath.split("/").pop() || rootPath,
        path: rootPath,
        type: "directory",
        children: [],
      },
      entries: [],
      metadata,
    };
    this.emitter = new EventEmitter();
    this.cwd = rootPath;
  }

  get session(): Session {
    return this._session;
  }

  get sessionId(): string {
    return this._session.id;
  }

  /**
   * Record a bash command execution
   */
  recordBash(
    command: string,
    result: {
      stdout?: string;
      stderr?: string;
      exitCode?: number;
    },
    startTime?: number
  ): TraversalEntry {
    const timestamp = Date.now();
    const operation = classifyCommand(command);
    const { raw: paths, resolved: resolvedPaths } = extractAndResolvePaths(
      command,
      this.cwd
    );

    // Update cwd if this was a cd command
    if (operation === "navigate" && command.trim().startsWith("cd ")) {
      const cdTarget = command.trim().slice(3).trim();
      if (cdTarget && result.exitCode === 0) {
        if (cdTarget.startsWith("/")) {
          this.cwd = cdTarget;
        } else if (cdTarget === "..") {
          this.cwd = this.cwd.split("/").slice(0, -1).join("/") || "/";
        } else if (cdTarget === "-") {
          // Can't track previous directory, keep current
        } else {
          this.cwd = `${this.cwd}/${cdTarget}`.replace(/\/+/g, "/");
        }
      }
    }

    const entry: TraversalEntry = {
      id: nanoid(),
      tool: "bash",
      command,
      cwd: this.cwd,
      timestamp,
      operation,
      paths,
      resolvedPaths,
      stdout: result.stdout ? truncateOutput(result.stdout) : undefined,
      stderr: result.stderr ? truncateOutput(result.stderr) : undefined,
      exitCode: result.exitCode,
      duration: startTime ? timestamp - startTime : undefined,
    };

    this._session.entries.push(entry);
    this.emitter.emit("entry", entry);

    return entry;
  }

  /**
   * Record a file read operation
   */
  recordFileRead(filePath: string, content?: string): TraversalEntry {
    const timestamp = Date.now();

    const entry: TraversalEntry = {
      id: nanoid(),
      tool: "readFile",
      filePath,
      cwd: this.cwd,
      timestamp,
      operation: "read",
      paths: [filePath],
      resolvedPaths: [filePath],
      stdout: content ? truncateOutput(content) : undefined,
    };

    this._session.entries.push(entry);
    this.emitter.emit("entry", entry);

    return entry;
  }

  /**
   * Record a file write operation
   */
  recordFileWrite(filePath: string, content?: string): TraversalEntry {
    const timestamp = Date.now();

    const entry: TraversalEntry = {
      id: nanoid(),
      tool: "writeFile",
      filePath,
      cwd: this.cwd,
      timestamp,
      operation: "write",
      paths: [filePath],
      resolvedPaths: [filePath],
      stdout: content ? truncateOutput(content) : undefined,
    };

    this._session.entries.push(entry);
    this.emitter.emit("entry", entry);

    return entry;
  }

  /**
   * Set or update the filesystem tree
   */
  setFilesystem(tree: FileNode): void {
    this._session.filesystem = tree;
    this.emitter.emit("filesystem", tree);
  }

  /**
   * End the session
   */
  endSession(): Session {
    this._session.endedAt = Date.now();
    this.emitter.emit("session-end", this._session);
    return this._session;
  }

  /**
   * Subscribe to session events
   */
  on(
    event: SessionEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void
  ): this {
    this.emitter.on(event, listener);
    return this;
  }

  /**
   * Unsubscribe from session events
   */
  off(
    event: SessionEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void
  ): this {
    this.emitter.off(event, listener);
    return this;
  }

  /**
   * Get the event emitter (for SSE streaming)
   */
  getEmitter(): EventEmitter {
    return this.emitter;
  }
}

/**
 * Truncate large outputs to prevent memory issues
 */
function truncateOutput(output: string, maxLength = 10240): string {
  if (output.length <= maxLength) {
    return output;
  }
  return output.slice(0, maxLength) + "\n... [truncated]";
}
