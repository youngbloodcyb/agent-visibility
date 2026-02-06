/**
 * Demo script to create a recorded traversal session.
 *
 * Run with: pnpm tsx scripts/demo.ts
 * Then visit: http://localhost:3000/traversal
 */

import { Sandbox } from "@vercel/sandbox";
import {
  captureFilesystemSnapshot,
  generateDemoFiles,
  saveSession,
  SessionRecorder,
} from "../lib/traversal-recorder";

async function main() {
  console.log("🚀 Creating sandbox...");
  const sandbox = await Sandbox.create({ runtime: "node24" });

  try {
    // Find out where we are
    console.log("📍 Finding working directory...");
    const pwdResult = await sandbox.runCommand("pwd");
    const cwd = (await pwdResult.stdout()).trim();
    console.log(`   Working directory: ${cwd}`);

    // Create workspace directory
    const rootPath = `${cwd}/workspace`;
    await sandbox.runCommand("mkdir", ["-p", rootPath]);

    console.log("📁 Uploading demo files...");
    const demoFiles = generateDemoFiles();
    // Prepend workspace path to all files
    const filesWithPath = demoFiles.map((f) => ({
      ...f,
      path: `${rootPath}/${f.path}`,
    }));
    await sandbox.writeFiles(filesWithPath);

    console.log("🔧 Setting up recorder...");
    const recorder = new SessionRecorder(rootPath);

    // Capture initial filesystem
    const initialTree = await captureFilesystemSnapshot(sandbox, rootPath);
    recorder.setFilesystem(initialTree);

    // Log entries as they're recorded
    recorder.on("entry", (entry) => {
      console.log(`  📝 ${entry.operation}: ${entry.command ?? entry.filePath}`);
    });

    // Helper to run command and record it
    const run = async (cmd: string) => {
      const startTime = Date.now();
      const result = await sandbox.runCommand("bash", [
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
        const newTree = await captureFilesystemSnapshot(sandbox, rootPath);
        recorder.setFilesystem(newTree);
      }
    };

    // Simulate an agent exploring the filesystem
    console.log("\n🤖 Simulating agent exploration...\n");

    // List root directory
    await run("ls -la");

    // Explore structure
    await run("find . -type f -name '*.js' | head -20");

    // Read package.json
    await run("cat package.json");

    // Navigate and explore src
    await run("ls -la src/");
    await run("ls -la src/components/");

    // Read some source files
    await run("cat src/index.js");
    await run("cat src/components/Button.jsx");

    // Search for patterns
    await run("grep -r 'export' src/ | head -10");

    // Check tests
    await run("ls -la tests/");
    await run("cat tests/test.js");

    // Create a new file
    await run("echo 'console.log(\"hello\")' > src/new-file.js");
    await run("cat src/new-file.js");

    // End and save session
    console.log("\n💾 Saving session...");
    const session = recorder.endSession();
    await saveSession(session);

    console.log(`\n✅ Session saved: ${session.id}`);
    console.log(`   Entries: ${session.entries.length}`);
    console.log(`\n🌐 View at: http://localhost:3000/traversal/${session.id}`);
    console.log(`   Or list all: http://localhost:3000/traversal`);
  } finally {
    console.log("\n🛑 Stopping sandbox...");
    await sandbox.stop();
  }
}

main().catch(console.error);
