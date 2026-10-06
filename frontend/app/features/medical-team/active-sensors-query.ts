import { DEFAULT_REFETCH_INTERVAL } from "@/lib/api.ts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";
import { fetchActiveSensors } from "./active-sensors-mock-data.ts";
import type { YardScope } from "./yard-filter-parsers.ts";

export function activeSensorsQueryOptions(scope: YardScope) {
	const { yardId, hall, occupation, start, end } = scope;

	return queryOptions({
		queryKey: ["medicalTeam", "activeSensors", yardId, hall, occupation, start.getTime(), end.getTime()],
		queryFn: () => fetchActiveSensors(scope),
		staleTime: minutesToMilliseconds(10),
		refetchInterval: DEFAULT_REFETCH_INTERVAL,
		placeholderData: keepPreviousData,
		refetchIntervalInBackground: true,
	});
}
