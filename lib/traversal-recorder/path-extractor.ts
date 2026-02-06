import { parse } from "shell-quote";

/**
 * Check if a token looks like a filesystem path
 */
function isLikelyPath(token: string): boolean {
  // Skip empty tokens
  if (!token || token.length === 0) return false;

  // Skip flags (start with -)
  if (token.startsWith("-")) return false;

  // Skip common shell operators and keywords
  const shellKeywords = [
    "&&",
    "||",
    "|",
    ";",
    "if",
    "then",
    "else",
    "fi",
    "for",
    "do",
    "done",
    "while",
    "case",
    "esac",
  ];
  if (shellKeywords.includes(token)) return false;

  // Current directory reference
  if (token === ".") return true;

  // Paths that start with /, ./, or ../
  if (token.startsWith("/") || token.startsWith("./") || token.startsWith("../"))
    return true;

  // Paths with file extensions (including dotfiles)
  if (/\.\w{1,10}$/.test(token)) return true;

  // Paths containing directory separators
  if (token.includes("/") && !token.includes("://")) return true;

  // Glob patterns
  if (token.includes("*") || token.includes("?")) return true;

  // Common directory names
  const commonDirs = [
    "src",
    "lib",
    "dist",
    "build",
    "node_modules",
    "components",
    "pages",
    "app",
    "public",
    "assets",
    "tests",
    "test",
    "spec",
    "config",
    "scripts",
    "docs",
    "hooks",
  ];
  if (commonDirs.includes(token)) return true;

  // Common config files without extensions
  const commonFiles = [
    "Makefile",
    "Dockerfile",
    "README",
    "LICENSE",
    "CHANGELOG",
  ];
  if (commonFiles.includes(token)) return true;

  return false;
}

/**
 * Resolve a path relative to a current working directory
 */
export function resolvePath(path: string, cwd: string): string {
  // Already absolute
  if (path.startsWith("/")) {
    return normalizePath(path);
  }

  // Handle . (current directory)
  if (path === ".") {
    return normalizePath(cwd);
  }

  // Handle ./ prefix
  if (path.startsWith("./")) {
    return normalizePath(`${cwd}/${path.slice(2)}`);
  }

  // Handle ../ prefix
  if (path.startsWith("../")) {
    const cwdParts = cwd.split("/").filter(Boolean);
    const pathParts = path.split("/");
    let upCount = 0;

    for (const part of pathParts) {
      if (part === "..") {
        upCount++;
      } else {
        break;
      }
    }

    const remainingCwd = cwdParts.slice(0, -upCount);
    const remainingPath = pathParts.slice(upCount);

    return normalizePath("/" + [...remainingCwd, ...remainingPath].join("/"));
  }

  // Relative path without prefix
  return normalizePath(`${cwd}/${path}`);
}

/**
 * Normalize a path by removing double slashes, trailing slashes, etc.
 */
function normalizePath(path: string): string {
  // Remove double slashes
  let normalized = path.replace(/\/+/g, "/");

  // Remove trailing slash (unless it's the root)
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Extract filesystem paths from a bash command
 */
export function extractPaths(command: string): string[] {
  const paths: string[] = [];

  try {
    const tokens = parse(command);

    for (const token of tokens) {
      // shell-quote returns strings for regular tokens
      // and objects for operators like { op: '|' }
      if (typeof token === "string" && isLikelyPath(token)) {
        paths.push(token);
      }
    }
  } catch {
    // If parsing fails, try a simple split
    const tokens = command.split(/\s+/);
    for (const token of tokens) {
      if (isLikelyPath(token)) {
        paths.push(token);
      }
    }
  }

  return paths;
}

/**
 * Extract and resolve all paths from a command
 */
export function extractAndResolvePaths(
  command: string,
  cwd: string
): { raw: string[]; resolved: string[] } {
  const rawPaths = extractPaths(command);
  const resolvedPaths = rawPaths.map((p) => resolvePath(p, cwd));

  return {
    raw: rawPaths,
    resolved: resolvedPaths,
  };
}
