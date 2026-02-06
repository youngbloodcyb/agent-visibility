import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { Session, SessionSummary } from "./types";

const SESSIONS_DIR = ".sessions";

/**
 * Ensure the sessions directory exists
 */
async function ensureSessionsDir(): Promise<string> {
  const dir = join(process.cwd(), SESSIONS_DIR);
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    // Directory already exists
  }
  return dir;
}

/**
 * Save a session to disk
 */
export async function saveSession(session: Session): Promise<void> {
  const dir = await ensureSessionsDir();
  const filePath = join(dir, `${session.id}.json`);
  await writeFile(filePath, JSON.stringify(session, null, 2), "utf-8");
}

/**
 * Load a session by ID
 */
export async function loadSession(id: string): Promise<Session | null> {
  const dir = await ensureSessionsDir();
  const filePath = join(dir, `${id}.json`);

  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as Session;
  } catch {
    return null;
  }
}

/**
 * List all saved session summaries
 */
export async function listSessions(): Promise<SessionSummary[]> {
  const dir = await ensureSessionsDir();

  try {
    const files = await readdir(dir);
    const sessions: SessionSummary[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const content = await readFile(join(dir, file), "utf-8");
        const session = JSON.parse(content) as Session;

        sessions.push({
          id: session.id,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          rootPath: session.rootPath,
          entryCount: session.entries.length,
          metadata: session.metadata,
        });
      } catch {
        // Skip invalid files
        continue;
      }
    }

    // Sort by startedAt descending (newest first)
    sessions.sort((a, b) => b.startedAt - a.startedAt);

    return sessions;
  } catch {
    return [];
  }
}

/**
 * Delete a session by ID
 */
export async function deleteSession(id: string): Promise<boolean> {
  const dir = await ensureSessionsDir();
  const filePath = join(dir, `${id}.json`);

  try {
    const { unlink } = await import("fs/promises");
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
