import type { Sandbox } from "@vercel/sandbox";
import type { FileNode } from "./types";

/**
 * Build a tree structure from find command output
 */
function buildTreeFromFindOutput(output: string, rootPath: string): FileNode {
  const lines = output.trim().split("\n").filter(Boolean);
  const root: FileNode = {
    name: rootPath.split("/").pop() || rootPath,
    path: rootPath,
    type: "directory",
    children: [],
  };

  // Map to quickly find nodes by path
  const nodeMap = new Map<string, FileNode>();
  nodeMap.set(rootPath, root);

  // Sort lines by path depth to ensure parents are processed first
  const sortedLines = lines.sort((a, b) => {
    const pathA = a.slice(2); // Skip type prefix "d " or "f "
    const pathB = b.slice(2);
    return pathA.split("/").length - pathB.split("/").length;
  });

  for (const line of sortedLines) {
    const typeChar = line[0];
    const path = line.slice(2);

    // Skip the root itself
    if (path === rootPath) continue;

    const isDirectory = typeChar === "d";
    const name = path.split("/").pop() || path;
    const extension = isDirectory ? undefined : name.split(".").pop();

    const node: FileNode = {
      name,
      path,
      type: isDirectory ? "directory" : "file",
      extension: isDirectory ? undefined : extension,
      children: isDirectory ? [] : undefined,
    };

    // Find parent
    const parentPath = path.split("/").slice(0, -1).join("/");
    const parent = nodeMap.get(parentPath);

    if (parent && parent.children) {
      parent.children.push(node);
    }

    nodeMap.set(path, node);
  }

  // Sort children: directories first, then alphabetically
  function sortChildren(node: FileNode): void {
    if (node.children) {
      node.children.sort((a, b) => {
        // Directories first
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });

      // Recursively sort children
      for (const child of node.children) {
        sortChildren(child);
      }
    }
  }

  sortChildren(root);

  return root;
}

/**
 * Capture a snapshot of the filesystem tree from a sandbox
 */
export async function captureFilesystemSnapshot(
  sandbox: Sandbox,
  rootPath: string
): Promise<FileNode> {
  try {
    const result = await sandbox.runCommand("find", [
      rootPath,
      "-maxdepth",
      "10",
      "!",
      "-path",
      "*/node_modules/*",
      "!",
      "-path",
      "*/.git/*",
      "!",
      "-path",
      "*/.next/*",
      "!",
      "-path",
      "*/dist/*",
      "-printf",
      "%y %p\\n",
    ]);

    const stdout = await result.stdout();

    if (!stdout.trim()) {
      // Return empty root if find returns nothing
      return {
        name: rootPath.split("/").pop() || rootPath,
        path: rootPath,
        type: "directory",
        children: [],
      };
    }

    return buildTreeFromFindOutput(stdout, rootPath);
  } catch (error) {
    console.error("Failed to capture filesystem snapshot:", error);
    // Return a minimal root node on error
    return {
      name: rootPath.split("/").pop() || rootPath,
      path: rootPath,
      type: "directory",
      children: [],
    };
  }
}

/**
 * Flatten a FileNode tree into an array of paths
 */
export function flattenTree(node: FileNode): string[] {
  const paths: string[] = [node.path];

  if (node.children) {
    for (const child of node.children) {
      paths.push(...flattenTree(child));
    }
  }

  return paths;
}

/**
 * Find a node by path in the tree
 */
export function findNodeByPath(
  root: FileNode,
  targetPath: string
): FileNode | null {
  if (root.path === targetPath) {
    return root;
  }

  if (root.children) {
    for (const child of root.children) {
      const found = findNodeByPath(child, targetPath);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Get all ancestor paths for a given path
 */
export function getAncestorPaths(path: string, rootPath: string): string[] {
  const ancestors: string[] = [];
  const parts = path.split("/");

  for (let i = 1; i < parts.length; i++) {
    const ancestorPath = parts.slice(0, i).join("/") || "/";
    if (ancestorPath.startsWith(rootPath) || rootPath.startsWith(ancestorPath)) {
      ancestors.push(ancestorPath);
    }
  }

  return ancestors;
}
