"use client";

import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/ai-elements/file-tree";
import { cn } from "@/lib/utils";
import type { FileNode, Operation } from "@/lib/traversal-recorder/types";
import { useMemo } from "react";

const OPERATION_COLORS: Record<Operation, { bg: string; ring: string; text: string }> = {
  read: { bg: "bg-blue-500/30", ring: "ring-blue-500", text: "text-blue-600 dark:text-blue-400" },
  list: { bg: "bg-green-500/30", ring: "ring-green-500", text: "text-green-600 dark:text-green-400" },
  write: { bg: "bg-orange-500/30", ring: "ring-orange-500", text: "text-orange-600 dark:text-orange-400" },
  navigate: { bg: "bg-purple-500/30", ring: "ring-purple-500", text: "text-purple-600 dark:text-purple-400" },
  search: { bg: "bg-yellow-500/30", ring: "ring-yellow-500", text: "text-yellow-600 dark:text-yellow-400" },
  execute: { bg: "bg-red-500/30", ring: "ring-red-500", text: "text-red-600 dark:text-red-400" },
  other: { bg: "bg-gray-500/30", ring: "ring-gray-500", text: "text-gray-600 dark:text-gray-400" },
};

export interface FileTreeViewerProps {
  filesystem: FileNode;
  highlightedPaths?: Set<string>;
  operation?: Operation;
  className?: string;
}

/**
 * Get all parent paths for a given path
 */
function getParentPaths(path: string): string[] {
  const parents: string[] = [];
  const parts = path.split("/").filter(Boolean);

  let current = "";
  for (let i = 0; i < parts.length - 1; i++) {
    current = current + "/" + parts[i];
    parents.push(current);
  }

  return parents;
}

/**
 * Normalize path for comparison (handle /sandbox vs sandbox, trailing slashes, etc.)
 */
function normalizePath(path: string): string {
  // Remove trailing slashes
  let normalized = path.replace(/\/+$/, "");
  // Ensure leading slash
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }
  return normalized;
}

export function FileTreeViewer({
  filesystem,
  highlightedPaths = new Set(),
  operation = "other",
  className,
}: FileTreeViewerProps) {
  // Normalize highlighted paths
  const normalizedHighlightedPaths = useMemo(() => {
    const normalized = new Set<string>();
    for (const path of highlightedPaths) {
      normalized.add(normalizePath(path));
    }
    return normalized;
  }, [highlightedPaths]);

  // Calculate which folders should be expanded to show highlighted paths
  const expandedPaths = useMemo(() => {
    const expanded = new Set<string>();

    // Always expand the root
    expanded.add(normalizePath(filesystem.path));

    // Expand all parent paths of highlighted items
    for (const path of normalizedHighlightedPaths) {
      const parents = getParentPaths(path);
      for (const parent of parents) {
        expanded.add(parent);
      }
      // Also add the path itself if it's a directory
      expanded.add(path);
    }

    return expanded;
  }, [normalizedHighlightedPaths, filesystem.path]);

  const colors = OPERATION_COLORS[operation];

  // Render a node recursively
  const renderNode = (node: FileNode): React.ReactNode => {
    const normalizedNodePath = normalizePath(node.path);
    const isHighlighted = normalizedHighlightedPaths.has(normalizedNodePath);

    const highlightClass = isHighlighted
      ? cn(colors.bg, colors.ring, colors.text, "ring-2 font-semibold")
      : undefined;

    if (node.type === "directory") {
      return (
        <FileTreeFolder
          key={node.path}
          path={normalizedNodePath}
          name={node.name}
          className={highlightClass}
        >
          {node.children?.map(renderNode)}
        </FileTreeFolder>
      );
    }

    return (
      <FileTreeFile
        key={node.path}
        path={normalizedNodePath}
        name={node.name}
        className={highlightClass}
      />
    );
  };

  return (
    <FileTree
      expanded={expandedPaths}
      className={cn("h-full overflow-auto border-0", className)}
    >
      {filesystem.children && filesystem.children.length > 0 ? (
        filesystem.children.map(renderNode)
      ) : (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No files in filesystem
        </div>
      )}
    </FileTree>
  );
}
