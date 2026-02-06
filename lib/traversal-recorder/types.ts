// Core types for the traversal recorder

export type Operation =
  | "read"
  | "list"
  | "write"
  | "navigate"
  | "search"
  | "execute"
  | "other";

export interface TraversalEntry {
  id: string;
  tool: "bash" | "readFile" | "writeFile";
  command?: string; // For bash commands
  filePath?: string; // For file operations
  cwd: string;
  timestamp: number;
  operation: Operation;
  paths: string[]; // Raw paths from command
  resolvedPaths: string[]; // Absolute resolved paths
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  duration?: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  extension?: string;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  rootPath: string;
  filesystem: FileNode;
  entries: TraversalEntry[];
  metadata?: {
    sandboxId?: string;
    runtime?: string;
  };
}

export interface SessionSummary {
  id: string;
  startedAt: number;
  endedAt?: number;
  rootPath: string;
  entryCount: number;
  metadata?: {
    sandboxId?: string;
    runtime?: string;
  };
}
