import { keepPreviousData, QueryClient } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";

// We have at most 1 data point every minute so we don't need a shorter refetch interval than that
const DEFAULT_REFETCH_INTERVAL = minutesToMilliseconds(1);

/**
 * Defaults for the generated API client's queries, whose keys start with `['api', ...]` or `['POST', 'api', ...]`.
 * Other queries, like the occupational health service's mock data, keep TanStack Query's defaults.
 */
function setApiQueryDefaults(client: QueryClient) {
	const defaults = {
		staleTime: minutesToMilliseconds(10),
		refetchInterval: DEFAULT_REFETCH_INTERVAL,
		refetchIntervalInBackground: true,
		placeholderData: keepPreviousData,
	};

	client.setQueryDefaults(["api"], defaults);
	client.setQueryDefaults(["POST", "api"], defaults);
	// Notes don't refetch in the background
	client.setQueryDefaults(["POST", "api", "notes"], { refetchIntervalInBackground: false });
}

export const queryClient = new QueryClient();
setApiQueryDefaults(queryClient);
