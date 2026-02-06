// Core types
export type {
  FileNode,
  Operation,
  Session,
  SessionSummary,
  TraversalEntry,
} from "./types";

// Main API
export {
  createInstrumentedTools,
  type CreateInstrumentedToolsOptions,
  type InstrumentedTools,
} from "./create-instrumented-tools";

// Session recording
export { SessionRecorder, type SessionEvent } from "./session-recorder";

// Utilities
export { classifyCommand, getCommandsForOperation } from "./command-classifier";
export {
  extractAndResolvePaths,
  extractPaths,
  resolvePath,
} from "./path-extractor";
export {
  captureFilesystemSnapshot,
  findNodeByPath,
  flattenTree,
  getAncestorPaths,
} from "./filesystem-snapshot";

// Storage
export {
  deleteSession,
  listSessions,
  loadSession,
  saveSession,
} from "./storage";

// Demo utilities
export { generateDemoFiles } from "./demo-files";
