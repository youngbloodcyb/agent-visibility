# Filesystem Traversal Recorder Architecture

This document explains how the traversal recorder system captures, stores, and visualizes an AI agent's filesystem exploration.

## Overview

The system hooks into `bash-tool` to intercept every command an AI agent executes inside a Vercel Sandbox. Each command is classified, paths are extracted, and the filesystem state is captured. These events are stored as JSON and can be played back in a visual UI.

```
┌─────────────────────────────────────────────────────────────────┐
│                        bash-tool                                │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │ onBeforeBashCall │───▶│ onAfterBashCall  │                  │
│  └────────┬─────────┘    └────────┬─────────┘                  │
│           │                       │                             │
│  createBashTool({ sandbox, hooks, ... })                       │
└───────────────────────────────────────────────────────────────┘
            │                       │
            ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Session Recorder                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Command     │  │ Path        │  │ Filesystem  │             │
│  │ Classifier  │  │ Extractor   │  │ Snapshot    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                          │                                      │
│                          ▼                                      │
│              ┌─────────────────────┐                           │
│              │   Session Store     │                           │
│              │  - filesystem tree  │                           │
│              │  - traversal log    │                           │
│              └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                           │ EventEmitter + SSE
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Playback UI                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ FileTree    │  │ Timeline    │  │ Command     │             │
│  │ (highlighted)│  │ (scrubber)  │  │ Panel       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Vercel Sandbox

The Vercel Sandbox provides an isolated VM environment where commands execute safely. Key characteristics:

- Full Linux environment with Node.js runtime
- Isolated filesystem that can be populated with files
- Commands run via `sandbox.runCommand()`
- Working directory discovered via `pwd` command

```typescript
import { Sandbox } from "@vercel/sandbox";

const sandbox = await Sandbox.create({ runtime: "node24" });

// Discover the actual working directory
const pwdResult = await sandbox.runCommand("pwd");
const cwd = (await pwdResult.stdout()).trim();

// Upload files to the sandbox
await sandbox.writeFiles([
  { path: `${cwd}/workspace/package.json`, content: Buffer.from("...") },
]);
```

### 2. bash-tool Integration

`bash-tool` wraps Vercel Sandbox and provides hooks for intercepting commands:

```typescript
import { createBashTool } from "bash-tool";

const { tools } = await createBashTool({
  sandbox,

  // Called before every bash command
  onBeforeBashCall: ({ command }) => {
    // Can modify or block commands
    return undefined;
  },

  // Called after every bash command completes
  onAfterBashCall: ({ command, result }) => {
    // Record the command and its output
    recorder.recordBash(command, {
      stdout: result.stdout,
      exitCode: result.exitCode,
    });
  },
});
```

### 3. Session Recorder

The `SessionRecorder` class manages session state and emits events:

```typescript
class SessionRecorder extends EventEmitter {
  private session: Session;

  recordBash(command: string, result: BashResult): TraversalEntry {
    const entry = {
      id: crypto.randomUUID(),
      tool: "bash",
      command,
      operation: classifyCommand(command),  // "read", "list", "write", etc.
      resolvedPaths: extractPaths(command, this.session.rootPath),
      stdout: result.stdout,
      exitCode: result.exitCode,
      timestamp: Date.now(),
    };

    this.session.entries.push(entry);
    this.emit("entry", entry);
    return entry;
  }
}
```

## Filesystem Snapshot

### How Snapshots Are Captured

The filesystem tree is captured using the `find` command:

```typescript
async function captureFilesystemSnapshot(
  sandbox: Sandbox,
  rootPath: string
): Promise<FileNode> {
  const result = await sandbox.runCommand("find", [
    rootPath,
    "-maxdepth", "10",
    "!", "-path", "*/node_modules/*",
    "!", "-path", "*/.git/*",
    "-printf", "%y %p\\n",  // Output: "d /path" or "f /path"
  ]);

  const stdout = await result.stdout();
  return buildTreeFromFindOutput(stdout, rootPath);
}
```

The output is parsed into a tree structure:

```typescript
interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  extension?: string;
}
```

### When Snapshots Update

- **Initial snapshot**: Captured when the session starts
- **After write operations**: When a command is classified as "write" (touch, mkdir, cp, mv, rm, etc.), a new snapshot is taken

```typescript
if (entry.operation === "write") {
  const newTree = await captureFilesystemSnapshot(sandbox, rootPath);
  recorder.setFilesystem(newTree);
  recorder.emit("filesystem", newTree);
}
```

## Event Storage

### JSON Session Format

Sessions are stored as JSON files in `.sessions/`:

```json
{
  "id": "abc123",
  "startedAt": 1707264000000,
  "endedAt": 1707264060000,
  "rootPath": "/vercel/sandbox/workspace",
  "filesystem": {
    "name": "workspace",
    "path": "/vercel/sandbox/workspace",
    "type": "directory",
    "children": [
      { "name": "package.json", "path": "/vercel/sandbox/workspace/package.json", "type": "file" },
      { "name": "src", "path": "/vercel/sandbox/workspace/src", "type": "directory", "children": [...] }
    ]
  },
  "entries": [
    {
      "id": "entry-1",
      "tool": "bash",
      "command": "ls -la",
      "operation": "list",
      "cwd": "/vercel/sandbox/workspace",
      "resolvedPaths": ["/vercel/sandbox/workspace"],
      "stdout": "total 12\ndrwxr-xr-x ...",
      "exitCode": 0,
      "timestamp": 1707264001000
    }
  ]
}
```

### Storage API

```typescript
// Save a session
await saveSession(session);  // Writes to .sessions/{id}.json

// Load a session
const session = await loadSession("abc123");

// List all sessions
const sessions = await listSessions();
```

## Live Streaming

### Server-Sent Events (SSE)

For live sessions, events stream to the client via SSE:

```typescript
// Server: app/api/session/live/route.ts
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      recorder.on("entry", (entry) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "entry", data: entry })}\n\n`)
        );
      });

      recorder.on("filesystem", (tree) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "filesystem", data: tree })}\n\n`)
        );
      });
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" }
  });
}
```

### Client Hook

```typescript
// hooks/use-live-session.ts
export function useLiveSession(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/session/live?sessionId=${sessionId}`);

    eventSource.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);

      if (type === "entry") {
        setSession(prev => ({
          ...prev!,
          entries: [...prev!.entries, data]
        }));
      }
    };

    return () => eventSource.close();
  }, [sessionId]);

  return session;
}
```

## Playback UI

### Component Hierarchy

```
TraversalViewer
├── SessionControls      (play/pause/speed)
├── TimelineScrubber     (visual timeline with dots)
└── Main Content
    ├── FileTreeViewer   (left: filesystem with highlights)
    └── EntryPanel       (right: command details)
```

### Playback Hook

The `usePlayback` hook manages playback state:

```typescript
const playback = usePlayback({ session, followLive: isLive });

// Returns:
{
  currentIndex: number,
  currentEntry: TraversalEntry | null,
  isPlaying: boolean,
  speed: 0.5 | 1 | 2 | 4,
  play: () => void,
  pause: () => void,
  goTo: (index: number) => void,
  stepForward: () => void,
  stepBack: () => void,
}
```

When playing, an interval advances `currentIndex` based on speed:

```typescript
useEffect(() => {
  if (isPlaying) {
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => Math.min(prev + 1, totalEntries - 1));
    }, 1000 / speed);
  }
  return () => clearInterval(intervalRef.current);
}, [isPlaying, speed]);
```

### Path Highlighting

The current entry's paths are highlighted in the file tree:

```typescript
const highlightedPaths = useMemo(() => {
  const paths = new Set<string>();
  if (currentEntry) {
    for (const path of currentEntry.resolvedPaths) {
      paths.add(path);
    }
  }
  return paths;
}, [currentEntry]);
```

Colors indicate operation type:
- **Blue**: read (cat, head, tail)
- **Green**: list (ls, find, tree)
- **Orange**: write (touch, mkdir, cp, mv, rm)
- **Purple**: navigate (cd, pwd)
- **Yellow**: search (grep, rg)
- **Red**: execute (node, npm, python)

## Command Classification

Commands are classified by their operation type:

```typescript
const READ_COMMANDS = ["cat", "head", "tail", "less", "more"];
const LIST_COMMANDS = ["ls", "find", "tree", "dir"];
const WRITE_COMMANDS = ["touch", "mkdir", "cp", "mv", "rm", "rmdir", "echo"];
const NAVIGATE_COMMANDS = ["cd", "pwd", "pushd", "popd"];
const SEARCH_COMMANDS = ["grep", "rg", "ag", "ack", "find"];
const EXECUTE_COMMANDS = ["node", "npm", "pnpm", "yarn", "python", "bash"];

function classifyCommand(command: string): Operation {
  const baseCommand = command.split(/\s+/)[0];

  if (READ_COMMANDS.includes(baseCommand)) return "read";
  if (LIST_COMMANDS.includes(baseCommand)) return "list";
  // ...
}
```

## Path Extraction

Paths are extracted from commands using `shell-quote`:

```typescript
import { parse } from "shell-quote";

function extractPaths(command: string, cwd: string): string[] {
  const tokens = parse(command);
  const paths: string[] = [];

  for (const token of tokens) {
    if (typeof token === "string" && looksLikePath(token)) {
      // Resolve relative paths
      const resolved = token.startsWith("/")
        ? token
        : path.resolve(cwd, token);
      paths.push(resolved);
    }
  }

  return paths;
}
```

## File Structure

```
lib/traversal-recorder/
├── index.ts                    # Barrel exports
├── types.ts                    # Core interfaces
├── create-instrumented-tools.ts # bash-tool wrapper
├── session-recorder.ts         # Session state + EventEmitter
├── command-classifier.ts       # Command → Operation
├── path-extractor.ts           # Extract paths from commands
├── filesystem-snapshot.ts      # Capture directory tree
├── storage.ts                  # JSON persistence
└── demo-files.ts               # Generate test files

app/api/
├── session/
│   ├── route.ts                # GET all sessions
│   ├── [id]/route.ts           # GET session by ID
│   └── live/route.ts           # SSE endpoint
└── demo/route.ts               # Live demo endpoint

components/traversal/
├── traversal-viewer.tsx        # Main container
├── file-tree-viewer.tsx        # Highlighted file tree
├── timeline-scrubber.tsx       # Visual timeline
├── entry-panel.tsx             # Command details
└── session-controls.tsx        # Playback controls

hooks/
├── use-playback.ts             # Playback state
└── use-live-session.ts         # SSE subscription
```

## Running the Demo

1. Start the dev server: `pnpm dev`
2. Navigate to `/traversal/live`
3. Click "Start Live Demo"
4. Watch as the sandbox executes commands and the UI updates in real-time

The demo creates a sandbox, uploads sample project files, and executes a series of exploration commands while streaming events to the UI.
