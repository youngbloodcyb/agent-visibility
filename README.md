<img width="3000" height="1552" alt="CleanShot 2026-02-06 at 16 58 02@2x" src="https://github.com/user-attachments/assets/ca6cc304-8043-41c8-8180-06bf589b86fc" />

# Bash Tool Visualizer

A tool for recording and visualizing bash command execution in sandboxed environments. It wraps `bash-tool` with instrumentation hooks to track every command, capture filesystem snapshots, and produce a traversal log for playback/visualization.

## How it works

The core is `createInstrumentedTools()` which:
- Creates a `SessionRecorder` to track commands and filesystem state
- Wraps bash-tool with `onBeforeBashCall`/`onAfterBashCall` hooks
- Captures filesystem snapshots after write operations
- Returns instrumented tools compatible with the AI SDK

## Routes

- `/demo` - Interactive demo to run bash commands in a sandbox and record the session
- `/traversal` - List all saved traversal sessions
- `/traversal/[id]` - View and playback a specific traversal

## Data Storage

Sessions are saved as JSON files in `.sessions/` directory. The types are defined in `lib/traversal-recorder/types.ts`:

- `Session` - Full session with filesystem tree and all entries
- `TraversalEntry` - Individual command record (tool, command, paths, stdout/stderr, etc.)
- `FileNode` - Filesystem tree structure
- `Operation` - Command type: `read`, `list`, `write`, `navigate`, `search`, `execute`, `other`
