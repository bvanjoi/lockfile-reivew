import { diffGraph } from "./graph/diff";
import type { Graph } from "./graph/types";

export function compare(target: Graph, current: Graph) {
  const diff = diffGraph(target, current);
  return {
    show(): { added: string[], deleted: string[] } {
      const added = diff.packages.added.map(key => key);
      const deleted = diff.packages.deleted.map(key => key)
      return {
        added,
        deleted
      }
    },
    showWorkspace(): Record<string, { added: string[], deleted: string[] }> {
      const changed: Record<string, { added: string[], deleted: string[] }> = {};
      diff.packages.deleted.forEach(key => {
        target.whoImportThisPackage(key)?.forEach(([importId]) => {
          if (!target.getImporter(importId)) {
            return;
          }
          if (!changed[importId]) {
            changed[importId] = { added: [], deleted: [] }
          }
          if (!changed[importId].deleted.includes(key)) {
            changed[importId].deleted.push(key)
          }
        })
      })
      diff.packages.added.forEach(key => {
        current.whoImportThisPackage(key)?.forEach(([importId]) => {
          if (!target.getImporter(importId)) {
            return;
          }
          if (!changed[importId]) {
            changed[importId] = { added: [], deleted: [] }
          }
          if (!changed[importId].added.includes(key)) {
            changed[importId].added.push(key)
          }
        })
      })
      return changed;
    },
    showPath(): { added: Record<string, string[][]>, deleted: Record<string, string[][]> } {
      const added = diff.packages.added.map(key => {
        const paths = current.whoImportThisPackage(key)!;
        return [key, paths] as [string, string[][]]
      })
      const deleted = diff.packages.deleted.map(key => {
        const paths = target.whoImportThisPackage(key)!;
        return [key, paths] as [string, string[][]]
      })
      return {
        added: Object.fromEntries(added),
        deleted: Object.fromEntries(deleted)
      }
    },
    showWorkspaceAndPath(): Record<string, { added: Record<string, string[][]>, deleted: Record<string, string[][]> }> {
      const changed: Record<string, { added: Record<string, string[][]>, deleted: Record<string, string[][]> }> = {};
      diff.packages.deleted.forEach(key => {
        target.whoImportThisPackage(key)?.forEach(paths => {
          const importerId = paths[0];
          if (!target.getImporter(importerId)) {
            return;
          }
          if (!changed[importerId]) {
            changed[importerId] = { added: {}, deleted: {} };
          }
          if (!changed[importerId].deleted[key]) {
            changed[importerId].deleted[key] = [];
          }
          changed[importerId].deleted[key].push(paths)
        })
      })
      diff.packages.added.forEach(key => {
        current.whoImportThisPackage(key)?.forEach(paths => {
          const importerId = paths[0];
          if (!target.getImporter(importerId)) {
            return;
          }
          if (!changed[importerId]) {
            changed[importerId] = { added: {}, deleted: {} };
          }
          if (!changed[importerId].added[key]) {
            changed[importerId].added[key] = [];
          }
          changed[importerId].added[key].push(paths)
        })
      })
      return changed;
    }
  }
}
