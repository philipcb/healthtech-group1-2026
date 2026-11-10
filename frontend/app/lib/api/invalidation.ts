import { getGetNotesQueryKey } from "@/lib/api/generated/note-data.ts";
import { getGetSubordinatesQueryKey } from "@/lib/api/generated/user.ts";
import type { QueryClient } from "@tanstack/react-query";

/*
 * Orval's `mutationInvalidates` can't be used: its generated `onSuccess` doesn't compile with the installed TanStack
 * Query, and its keys for `POST` queries end with an `undefined` request body, which doesn't match any query.
 */

/**
 * Every subordinates query of the manager, whatever its time range. Its key is a prefix of the threshold summary's,
 * so the team's status counts are refreshed too, which they need to be after the team has changed.
 */
export const invalidateSubordinates = (queryClient: QueryClient, managerId: string) =>
	queryClient.invalidateQueries({ queryKey: getGetSubordinatesQueryKey(managerId) });

/** Every notes query of the user, whatever its time range. Orval's key for that ends with an `undefined` request body. */
export const invalidateNotes = (queryClient: QueryClient, userId: string) =>
	queryClient.invalidateQueries({ queryKey: getGetNotesQueryKey(userId).filter((part) => part !== undefined) });
