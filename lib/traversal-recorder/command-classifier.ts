import type { Operation } from "./types";

// Command patterns for classification
const COMMAND_PATTERNS: Record<Operation, string[]> = {
  read: ["cat", "head", "tail", "less", "more", "bat", "view"],
  list: ["ls", "find", "tree", "dir", "exa", "fd"],
  write: ["touch", "mkdir", "cp", "mv", "rm", "rmdir", "echo", "tee", "dd"],
  navigate: ["cd", "pwd", "pushd", "popd"],
  search: ["grep", "rg", "ag", "ack", "fgrep", "egrep", "ripgrep"],
  execute: [
    "node",
    "npm",
    "pnpm",
    "yarn",
    "bun",
    "python",
    "python3",
    "pip",
    "bash",
    "sh",
    "zsh",
    "deno",
    "go",
    "cargo",
    "rustc",
    "make",
    "cmake",
    "gcc",
    "g++",
    "java",
    "javac",
    "ruby",
    "gem",
    "php",
    "composer",
  ],
  other: [],
};

// Build reverse lookup map
const commandToOperation = new Map<string, Operation>();
for (const [operation, commands] of Object.entries(COMMAND_PATTERNS)) {
  for (const cmd of commands) {
    commandToOperation.set(cmd, operation as Operation);
  }
}

/**
 * Extract the base command from a command string
 * Handles paths like /usr/bin/cat -> cat
 */
function extractBaseCommand(command: string): string {
  const trimmed = command.trim();

  // Handle empty commands
  if (!trimmed) return "";

  // Split by whitespace to get first token
  const firstToken = trimmed.split(/\s+/)[0];

  // Handle paths (e.g., /usr/bin/cat -> cat)
  const baseName = firstToken.split("/").pop() || firstToken;

  return baseName;
}

/**
 * Check if a command contains output redirection (write operation)
 */
function hasWriteRedirection(command: string): boolean {
  // Match >, >>, or | tee patterns
  return /[^2]>|>>|\|\s*tee\s/.test(command);
}

/**
 * Classify a bash command by its operation type
 */
export function classifyCommand(command: string): Operation {
  const baseCommand = extractBaseCommand(command);

  // Check for write redirection first (echo "foo" > file is a write)
  if (hasWriteRedirection(command)) {
    return "write";
  }

  // Look up the command in our map
  const operation = commandToOperation.get(baseCommand);
  if (operation) {
    return operation;
  }

  // Default to other
  return "other";
}

/**
 * Get all commands for a specific operation type
 */
export function getCommandsForOperation(operation: Operation): string[] {
  return COMMAND_PATTERNS[operation] || [];
}
