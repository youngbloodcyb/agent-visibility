"use client";

import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/ai-elements/file-tree";
import { cn } from "@/lib/utils";
import type { FileNode, Operation } from "@/lib/traversal-recorder/types";
import { useCallback, useMemo } from "react";

const OPERATION_COLORS: Record<Operation, string> = {
  read: "bg-blue-500/20 ring-blue-500",
  list: "bg-green-500/20 ring-green-500",
  write: "bg-orange-500/20 ring-orange-500",
  navigate: "bg-purple-500/20 ring-purple-500",
  search: "bg-yellow-500/20 ring-yellow-500",
  execute: "bg-red-500/20 ring-red-500",
  other: "bg-gray-500/20 ring-gray-500",
};

export interface FileTreeViewerProps {
  filesystem: FileNode;
  highlightedPaths?: Set<string>;
  operation?: Operation;
  selectedPath?: string;
  onSelectPath?: (path: string) => void;
  className?: string;
}

export function FileTreeViewer({
  filesystem,
  highlightedPaths = new Set(),
  operation = "other",
  selectedPath,
  onSelectPath,
  className,
}: FileTreeViewerProps) {
  // Calculate which folders should be expanded to show highlighted paths
  const expandedPaths = useMemo(() => {
    const expanded = new Set<string>();

    for (const path of highlightedPaths) {
      // Add all parent paths
      const parts = path.split("/");
      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join("/") || "/";
        expanded.add(parentPath);
      }
    }

    // Also expand the root
    expanded.add(filesystem.path);

    return expanded;
  }, [highlightedPaths, filesystem.path]);

  const getHighlightClass = useCallback(
    (path: string) => {
      if (highlightedPaths.has(path)) {
        return cn(OPERATION_COLORS[operation], "ring-2 rounded");
      }
      return undefined;
    },
    [highlightedPaths, operation]
  );

  const renderNode = useCallback(
    (node: FileNode): React.ReactNode => {
      if (node.type === "directory") {
        return (
          <FileTreeFolder
            key={node.path}
            path={node.path}
            name={node.name}
            className={getHighlightClass(node.path)}
          >
            {node.children?.map(renderNode)}
          </FileTreeFolder>
        );
      }

      return (
        <FileTreeFile
          key={node.path}
          path={node.path}
          name={node.name}
          className={getHighlightClass(node.path)}
        />
      );
    },
    [getHighlightClass]
  );

  return (
    <FileTree
      expanded={expandedPaths}
      selectedPath={selectedPath}
      onSelect={onSelectPath}
      className={cn("h-full overflow-auto", className)}
    >
      {filesystem.children?.map(renderNode)}
    </FileTree>
  );
}
