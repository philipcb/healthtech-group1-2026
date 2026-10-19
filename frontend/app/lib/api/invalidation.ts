import { getGetNotesQueryKey } from "@/lib/api/generated/note-data.ts";
import { getGetSubordinatesQueryKey, getGetThresholdSummaryQueryKey } from "@/lib/api/generated/user.ts";
import { matchQuery, type QueryClient } from "@tanstack/react-query";

/*
 * Orval's `mutationInvalidates` can't be used: its generated `onSuccess` doesn't compile with the installed TanStack
 * Query, and its keys for `POST` queries end with an `undefined` request body, which doesn't match any query.
 */

/** Every subordinates query of the manager, whatever its time range */
export const invalidateSubordinates = (queryClient: QueryClient, managerId: string) =>
	queryClient.invalidateQueries({
		queryKey: getGetSubordinatesQueryKey(managerId),
		// Changing the team doesn't refresh the threshold summary, although its key starts with the subordinates' key
		predicate: (query) => !matchQuery({ queryKey: getGetThresholdSummaryQueryKey(managerId) }, query),
	});

/** Every notes query of the user, whatever its time range. Orval's key for that ends with an `undefined` request body. */
export const invalidateNotes = (queryClient: QueryClient, userId: string) =>
	queryClient.invalidateQueries({ queryKey: getGetNotesQueryKey(userId).filter((part) => part !== undefined) });
