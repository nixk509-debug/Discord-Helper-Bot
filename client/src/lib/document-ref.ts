/**
 * Commands ↔ Studio Document Contract
 *
 * This module provides utilities for surfacing the relationship between
 * Custom Commands and Studio Documents. When a command uses a studio
 * document (e.g. a publish-on-run embed), this contract makes that
 * visible in both directions.
 */

import { useQuery } from "@tanstack/react-query";

export interface CommandDocumentRef {
  commandId: number;
  commandName: string;
  documentId: number;
}

/**
 * Hook: returns commands that reference a given studio document.
 * Currently a stub — real data will come from a server query once
 * the command-document link is persisted server-side.
 */
export function useCommandsReferencingDocument(_documentId: number) {
  return useQuery<CommandDocumentRef[]>({
    queryKey: ["document-refs", _documentId],
    queryFn: async () => [],
    staleTime: 60_000,
    enabled: false, // disabled until server contract is implemented
  });
}
