"use client";

import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/ai-elements/file-tree";
import { cn } from "@/lib/utils";
import type { FileNode, Operation } from "@/lib/traversal-recorder/types";
import { motion, AnimatePresence } from "motion/react";
import { useMemo } from "react";

const OPERATION_COLORS: Record<Operation, { bg: string; ring: string; text: string; glow: string }> = {
  read: { bg: "bg-blue-500/30", ring: "ring-blue-500", text: "text-blue-600 dark:text-blue-400", glow: "0 0 20px rgba(59, 130, 246, 0.5)" },
  list: { bg: "bg-green-500/30", ring: "ring-green-500", text: "text-green-600 dark:text-green-400", glow: "0 0 20px rgba(34, 197, 94, 0.5)" },
  write: { bg: "bg-orange-500/30", ring: "ring-orange-500", text: "text-orange-600 dark:text-orange-400", glow: "0 0 20px rgba(249, 115, 22, 0.5)" },
  navigate: { bg: "bg-purple-500/30", ring: "ring-purple-500", text: "text-purple-600 dark:text-purple-400", glow: "0 0 20px rgba(168, 85, 247, 0.5)" },
  search: { bg: "bg-yellow-500/30", ring: "ring-yellow-500", text: "text-yellow-600 dark:text-yellow-400", glow: "0 0 20px rgba(234, 179, 8, 0.5)" },
  execute: { bg: "bg-red-500/30", ring: "ring-red-500", text: "text-red-600 dark:text-red-400", glow: "0 0 20px rgba(239, 68, 68, 0.5)" },
  other: { bg: "bg-gray-500/30", ring: "ring-gray-500", text: "text-gray-600 dark:text-gray-400", glow: "0 0 20px rgba(107, 114, 128, 0.5)" },
};

export interface FileTreeViewerProps {
  filesystem: FileNode;
  highlightedPaths?: Set<string>;
  operation?: Operation;
  className?: string;
}

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

function normalizePath(path: string): string {
  let normalized = path.replace(/\/+$/, "");
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
  const normalizedHighlightedPaths = useMemo(() => {
    const normalized = new Set<string>();
    for (const path of highlightedPaths) {
      normalized.add(normalizePath(path));
    }
    return normalized;
  }, [highlightedPaths]);

  const expandedPaths = useMemo(() => {
    const expanded = new Set<string>();
    expanded.add(normalizePath(filesystem.path));

    for (const path of normalizedHighlightedPaths) {
      const parents = getParentPaths(path);
      for (const parent of parents) {
        expanded.add(parent);
      }
      expanded.add(path);
    }

    return expanded;
  }, [normalizedHighlightedPaths, filesystem.path]);

  const colors = OPERATION_COLORS[operation];

  const renderNode = (node: FileNode): React.ReactNode => {
    const normalizedNodePath = normalizePath(node.path);
    const isHighlighted = normalizedHighlightedPaths.has(normalizedNodePath);

    if (node.type === "directory") {
      return (
        <div key={node.path} className="relative">
          <AnimatePresence>
            {isHighlighted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "absolute inset-0 rounded-md",
                  colors.bg,
                  colors.ring,
                  "ring-2"
                )}
                style={{ boxShadow: colors.glow }}
              />
            )}
          </AnimatePresence>
          <FileTreeFolder
            path={normalizedNodePath}
            name={node.name}
            className={cn(
              "relative z-10 transition-colors duration-200",
              isHighlighted && colors.text
            )}
          >
            {node.children?.map(renderNode)}
          </FileTreeFolder>
        </div>
      );
    }

    return (
      <div key={node.path} className="relative">
        <AnimatePresence>
          {isHighlighted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "absolute inset-0 rounded-md",
                colors.bg,
                colors.ring,
                "ring-2"
              )}
              style={{ boxShadow: colors.glow }}
            />
          )}
        </AnimatePresence>
        <FileTreeFile
          path={normalizedNodePath}
          name={node.name}
          className={cn(
            "relative z-10 transition-colors duration-200",
            isHighlighted && colors.text
          )}
        />
      </div>
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
