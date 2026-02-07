# Bash Tool Visualizer

A tool for recording and visualizing bash command execution in sandboxed environments. It wraps `bash-tool` with instrumentation hooks to track every command, capture filesystem snapshots, and produce a traversal log for playback/visualization.

## How it works

The core is `createInstrumentedTools()` which:
- Creates a `SessionRecorder` to track commands and filesystem state
- Wraps bash-tool with `onBeforeBashCall`/`onAfterBashCall` hooks
- Captures filesystem snapshots after write operations
- Returns instrumented tools compatible with the AI SDK
